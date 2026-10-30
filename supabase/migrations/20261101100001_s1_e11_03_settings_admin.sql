/*
 * Migration: the content settings screen's server side (story S1-E11-03; architecture 1.8.2 and
 * 1.8.4, 8.6 Settings).
 *
 * What it adds, all for owner and admin in a staff session (area settings, architecture 1.8.3):
 *   admin_set_flag()              switches a feature flag on or off
 *   admin_set_setting()           changes a named value; the new value must keep the old one's shape
 *   admin_move_category()         moves a category up or down the list readers see
 *   admin_add_reserved_name(), admin_remove_reserved_name()
 *   admin_add_name_word(), admin_remove_name_word()
 *                                 the reserved names and the username word lists (S1-E2-04)
 * Every change writes the audit log in the same transaction with the before and after values,
 * under an action starting "settings." so the screen can link to them (criterion 1).
 * "Applies within a minute": the database reads each value when it is used, so a change applies at
 * once on the server; the app re-reads public flags and settings every minute.
 * Categories are reordered, not added: a category's name lives in the locale files, so a new one
 * arrives in a release with its ro and en names (CLAUDE.md rule 4).
 */

/* ---------- The one check ---------- */

/**
 * require_settings_staff: refuses anyone who may not change settings. Internal.
 * Errors: insufficient_privilege unless the caller is owner or admin in a staff session.
 */
create or replace function public.require_settings_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('settings', 'act') then
    raise exception 'Only the owner and admins can change settings.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_settings_staff() is 'Internal: refuses anyone who may not change settings (S1-E11-03).';
revoke execute on function public.require_settings_staff() from public, anon, authenticated;

/* ---------- Flags ---------- */

/**
 * admin_set_flag: switches a feature flag (criterion 1).
 * Inputs: flag_key, for example 'maintenance_mode'; turn_on, the new state.
 * Returns: the new state.
 * Errors: insufficient_privilege (require_settings_staff()); no_data_found for an unknown flag.
 * Logged as settings.flag with the before and after state. Where it fits: Staff › Settings.
 */
create or replace function public.admin_set_flag(flag_key text, turn_on boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_on boolean;
begin
  perform public.require_settings_staff();
  -- Step 1: the flag as it was, locked so two admins can't both change it at once.
  select is_enabled into was_on from public.feature_flags where key = flag_key for update;
  if was_on is null then
    raise exception 'There is no flag called %.', flag_key using errcode = 'no_data_found';
  end if;
  -- Step 2: the change and its log line, in the same transaction.
  update public.feature_flags set is_enabled = turn_on where key = flag_key;
  perform public.log_staff_action('settings.flag', 'feature_flags', flag_key, null, null,
    jsonb_build_object('is_enabled', was_on), jsonb_build_object('is_enabled', turn_on));
  return turn_on;
end;
$$;

comment on function public.admin_set_flag(text, boolean) is
  'Switches a feature flag on or off; owner and admin only; logged (S1-E11-03).';
revoke execute on function public.admin_set_flag(text, boolean) from public, anon;
grant execute on function public.admin_set_flag(text, boolean) to authenticated;

/* ---------- Named values ---------- */

/**
 * setting_value_problem: why a new value can't replace an old one, or null when it can. Internal.
 * Returns: a reason word the screen words: wrong_kind, below_zero, bad_item, repeated_item or
 *   changed_parts; null when the value is fine.
 * Inputs: old_value and new_value, both JSON.
 * Rules: the same JSON type; numbers zero or more; a list holds distinct, non-empty texts when the
 *   old one held texts, or numbers zero or more when it held numbers; an object keeps exactly the
 *   same keys and each value follows these rules against the old one. So a screen can't change the
 *   shape the database's functions read.
 */
create or replace function public.setting_value_problem(old_value jsonb, new_value jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  old_keys text[];
  new_keys text[];
  entry record;
  problem text;
begin
  -- Step 1: the type must stay the same (a number stays a number, a list a list).
  if new_value is null or jsonb_typeof(old_value) <> jsonb_typeof(new_value) then
    return 'wrong_kind';
  end if;
  -- Step 2: numbers are counts, limits, hours or weights: never below zero.
  if jsonb_typeof(new_value) = 'number' and (new_value #>> '{}')::numeric < 0 then
    return 'below_zero';
  end if;
  -- Step 3: a list keeps its kind of items; texts are distinct and not empty.
  if jsonb_typeof(new_value) = 'array' then
    if exists (select 1 from jsonb_array_elements(new_value) as item
               where jsonb_typeof(item) not in ('string', 'number')
                  or (jsonb_typeof(item) = 'string' and btrim(item #>> '{}') = '')
                  or (jsonb_typeof(item) = 'number' and (item #>> '{}')::numeric < 0)) then
      return 'bad_item';
    end if;
    if (select count(*) from jsonb_array_elements(new_value)) <> (select count(distinct item) from jsonb_array_elements(new_value) as item) then
      return 'repeated_item';
    end if;
  end if;
  -- Step 4: an object keeps its keys, and each value follows the same rules.
  if jsonb_typeof(new_value) = 'object' then
    select array_agg(key order by key) into old_keys from jsonb_object_keys(old_value) as key;
    select array_agg(key order by key) into new_keys from jsonb_object_keys(new_value) as key;
    if old_keys is distinct from new_keys then
      return 'changed_parts';
    end if;
    for entry in select key from jsonb_object_keys(old_value) as key loop
      problem := public.setting_value_problem(old_value -> entry.key, new_value -> entry.key);
      if problem is not null then
        return problem;
      end if;
    end loop;
  end if;
  return null;
end;
$$;

comment on function public.setting_value_problem(jsonb, jsonb) is
  'Internal: a reason word when a new setting value can''t replace the old one, or null (S1-E11-03).';
revoke execute on function public.setting_value_problem(jsonb, jsonb) from public, anon, authenticated;

/**
 * admin_set_setting: changes a named value, for example teaser_length or a ranking weight
 * (criterion 1).
 * Inputs: setting_key; new_value, JSON of the same shape as the current value.
 * Returns: the new value.
 * Errors: insufficient_privilege; no_data_found for an unknown key; check_violation, with the
 *   reason word as the hint, when the value's shape changes, a number is below zero or a list repeats an item.
 * Logged as settings.value with the before and after values.
 */
create or replace function public.admin_set_setting(setting_key text, new_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_value jsonb;
  problem text;
begin
  perform public.require_settings_staff();
  -- Step 1: the value as it was, locked for the change.
  select value into old_value from public.settings where key = setting_key for update;
  if old_value is null then
    raise exception 'There is no setting called %.', setting_key using errcode = 'no_data_found';
  end if;
  -- Step 2: the new value must keep the shape the database's functions read.
  problem := public.setting_value_problem(old_value, new_value);
  if problem is not null then
    raise exception 'This value can''t be saved (%).', problem using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 3: the change and its log line.
  update public.settings set value = new_value where key = setting_key;
  perform public.log_staff_action('settings.value', 'settings', setting_key, null, null,
    jsonb_build_object('value', old_value), jsonb_build_object('value', new_value));
  return new_value;
end;
$$;

comment on function public.admin_set_setting(text, jsonb) is
  'Changes a named setting, keeping its shape; owner and admin only; logged (S1-E11-03).';
revoke execute on function public.admin_set_setting(text, jsonb) from public, anon;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;

/* ---------- Categories ---------- */

/**
 * admin_move_category: moves a category one place up or down the order readers see.
 * Inputs: category_slug, for example 'poetry'; move_by, -1 (up) or 1 (down).
 * Returns: the category's new position (unchanged at either end of the list).
 * Errors: insufficient_privilege; no_data_found for an unknown category; check_violation when
 *   move_by is not -1 or 1. Logged as settings.category_moved with the order before and after.
 */
create or replace function public.admin_move_category(category_slug text, move_by integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  moving public.categories;
  neighbour public.categories;
  order_before jsonb;
begin
  perform public.require_settings_staff();
  if move_by not in (-1, 1) then
    raise exception 'A category moves one place at a time.' using errcode = 'check_violation';
  end if;
  -- Step 1: the category and the one it swaps places with.
  select * into moving from public.categories where slug = category_slug for update;
  if moving.id is null then
    raise exception 'There is no such category.' using errcode = 'no_data_found';
  end if;
  select * into neighbour from public.categories
  where (move_by = -1 and position < moving.position) or (move_by = 1 and position > moving.position)
  order by case when move_by = -1 then -position else position end
  limit 1
  for update;
  if neighbour.id is null then
    return moving.position;
  end if;
  -- Step 2: swap the two positions and log the whole order before and after.
  select jsonb_agg(slug order by position) into order_before from public.categories;
  update public.categories set position = neighbour.position where id = moving.id;
  update public.categories set position = moving.position where id = neighbour.id;
  perform public.log_staff_action('settings.category_moved', 'categories', moving.slug, null, null,
    jsonb_build_object('order', order_before),
    jsonb_build_object('order', (select jsonb_agg(slug order by position) from public.categories)));
  return neighbour.position;
end;
$$;

comment on function public.admin_move_category(text, integer) is
  'Moves a category one place up or down; owner and admin only; logged (S1-E11-03).';
revoke execute on function public.admin_move_category(text, integer) from public, anon;
grant execute on function public.admin_move_category(text, integer) to authenticated;

/* ---------- Reserved names and the username word lists (S1-E2-04) ---------- */

/**
 * admin_add_reserved_name: reserves a name so nobody can take it as a username or pen name.
 * Inputs: new_name; how_it_matches, 'anywhere', 'whole_word' or 'whole_name'.
 * Returns: the new row's ID. The fold trigger (S1-E2-04) works out its matching form.
 * Errors: insufficient_privilege; check_violation for an empty name or an unknown match rule;
 *   unique_violation when the name is already reserved. Logged as settings.reserved_name_added.
 */
create or replace function public.admin_add_reserved_name(new_name text, how_it_matches text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added_id uuid;
begin
  perform public.require_settings_staff();
  if btrim(coalesce(new_name, '')) = '' then
    raise exception 'Type the name to reserve.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.reserved_names where lower(name) = lower(btrim(new_name))) then
    raise exception 'That name is already reserved.' using errcode = 'unique_violation';
  end if;
  -- Reason 'staff': added on the settings screen; 'system' rows came with the platform.
  insert into public.reserved_names (name, reason, match_rule)
  values (btrim(new_name), 'staff', how_it_matches)
  returning id into added_id;
  perform public.log_staff_action('settings.reserved_name_added', 'reserved_names', added_id::text, null, null,
    null, jsonb_build_object('name', btrim(new_name), 'match_rule', how_it_matches));
  return added_id;
end;
$$;

comment on function public.admin_add_reserved_name(text, text) is
  'Reserves a username or pen name; owner and admin only; logged (S1-E11-03, S1-E2-04).';
revoke execute on function public.admin_add_reserved_name(text, text) from public, anon;
grant execute on function public.admin_add_reserved_name(text, text) to authenticated;

/**
 * admin_remove_reserved_name: frees a name staff reserved. The platform's own names (reason
 * 'system', for example "settings" or "staff") can't be removed here, because routes depend on them.
 * Input: target_name_id. Returns: true.
 * Errors: insufficient_privilege; no_data_found for an unknown ID; check_violation for a system
 *   name. Logged as settings.reserved_name_removed.
 */
create or replace function public.admin_remove_reserved_name(target_name_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.reserved_names;
begin
  perform public.require_settings_staff();
  select * into removed from public.reserved_names where id = target_name_id for update;
  if removed.id is null then
    raise exception 'There is no such reserved name.' using errcode = 'no_data_found';
  end if;
  if removed.reason = 'system' then
    raise exception 'The platform''s own names stay reserved.' using errcode = 'check_violation';
  end if;
  delete from public.reserved_names where id = target_name_id;
  perform public.log_staff_action('settings.reserved_name_removed', 'reserved_names', removed.id::text, null, null,
    jsonb_build_object('name', removed.name, 'match_rule', removed.match_rule), null);
  return true;
end;
$$;

comment on function public.admin_remove_reserved_name(uuid) is
  'Frees a name staff reserved (never a system one); owner and admin only; logged (S1-E11-03).';
revoke execute on function public.admin_remove_reserved_name(uuid) from public, anon;
grant execute on function public.admin_remove_reserved_name(uuid) to authenticated;

/**
 * admin_add_name_word: adds a word to the username word list of one language (S1-E2-04).
 * Inputs: word_language, 'ro' or 'en'; new_word; how_it_matches, 'anywhere' or 'whole_word'.
 * Returns: the new row's ID.
 * Errors: insufficient_privilege; check_violation for an empty word, another language or an
 *   unknown match rule; unique_violation when the list already has it. Logged as
 *   settings.name_word_added (the word itself is in the log: it is a setting, not personal data).
 */
create or replace function public.admin_add_name_word(word_language text, new_word text, how_it_matches text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added_id uuid;
begin
  perform public.require_settings_staff();
  if btrim(coalesce(new_word, '')) = '' or word_language not in ('ro', 'en') then
    raise exception 'Type a word and pick Română or English.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.username_word_lists
             where language = word_language and lower(word) = lower(btrim(new_word))) then
    raise exception 'That word is already on the list.' using errcode = 'unique_violation';
  end if;
  insert into public.username_word_lists (language, word, match_rule)
  values (word_language, btrim(new_word), how_it_matches)
  returning id into added_id;
  perform public.log_staff_action('settings.name_word_added', 'username_word_lists', added_id::text, null, null,
    null, jsonb_build_object('language', word_language, 'word', btrim(new_word), 'match_rule', how_it_matches));
  return added_id;
end;
$$;

comment on function public.admin_add_name_word(text, text, text) is
  'Adds a word to a username word list; owner and admin only; logged (S1-E11-03, S1-E2-04).';
revoke execute on function public.admin_add_name_word(text, text, text) from public, anon;
grant execute on function public.admin_add_name_word(text, text, text) to authenticated;

/**
 * admin_remove_name_word: takes a word off a username word list.
 * Input: target_word_id. Returns: true.
 * Errors: insufficient_privilege; no_data_found for an unknown ID. Logged as
 *   settings.name_word_removed.
 */
create or replace function public.admin_remove_name_word(target_word_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.username_word_lists;
begin
  perform public.require_settings_staff();
  delete from public.username_word_lists where id = target_word_id returning * into removed;
  if removed.id is null then
    raise exception 'There is no such word on the lists.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('settings.name_word_removed', 'username_word_lists', removed.id::text, null, null,
    jsonb_build_object('language', removed.language, 'word', removed.word), null);
  return true;
end;
$$;

comment on function public.admin_remove_name_word(uuid) is
  'Takes a word off a username word list; owner and admin only; logged (S1-E11-03).';
revoke execute on function public.admin_remove_name_word(uuid) from public, anon;
grant execute on function public.admin_remove_name_word(uuid) to authenticated;
