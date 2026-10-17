-- Usernames (handles) and optional pen names (story S1-E2-04).
--
-- What it adds:
--   profiles.handle, handle_slug, handle_skeleton, handle_changed_at   the username, its web-address
--                                     form and its look-alike form (both unique)
--   profiles.pen_name, pen_name_changed_at                              the optional pen name
--   username_approvals                a moderator's approval of a name the checks refused by
--                                     mistake (a false hit, such as a surname)
--   check_handle(), check_pen_name()  the forms' question "is this name allowed?"
--   set_my_handle(), set_my_pen_name()  save a name, at most once every 30 days after the first
--   admin_approve_username()          a moderator approves a false hit (screen in S1-E11-02)
--   display_name()                    the pen name when there is one, else the username
--   account_state()                   now answers handle_missing until a username is chosen
-- Rules: story S1-E2-04 and the rules in …_s1_e2_04_name_rules.sql. Changes: once every 30 days,
-- and the first choice in setup doesn't count; old names go to the audit log (decided 17 Oct 2026,
-- 19:43, Q11). Usernames are public (people find and mention each other by them); the user ID
-- never is (architecture 1.6).

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('handle_change_days', '30'::jsonb, true,
   'Days between username changes; the first choice doesn''t count (S1-E2-04, Q11).'),
  ('pen_name_change_days', '30'::jsonb, true,
   'Days between pen name changes; the first choice doesn''t count (S1-E2-04, Q11).');

/**
 * setting_value: reads one setting.
 * Input: setting_key. Returns: its jsonb value, or null when there is no such setting.
 * Internal: private settings must not reach clients through it.
 */
create or replace function public.setting_value(setting_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select settings.value from public.settings where settings.key = setting_key;
$$;

comment on function public.setting_value(text) is 'Internal: one setting''s value, or null (S1-E2-04).';
revoke execute on function public.setting_value(text) from public, anon, authenticated;

/* ---------- Profile columns ---------- */

alter table public.profiles
  add column handle text,
  add column handle_slug text,
  add column handle_skeleton text,
  add column handle_changed_at timestamptz,
  add column pen_name text,
  add column pen_name_changed_at timestamptz,
  add constraint profiles_handle_length check (handle is null or char_length(handle) between 3 and 30),
  add constraint profiles_pen_name_length check (pen_name is null or char_length(pen_name) between 1 and 50);

comment on column public.profiles.handle is
  'The username, as typed: public; people find and mention each other by it (S1-E2-04).';
comment on column public.profiles.handle_slug is
  'The username''s web-address form (name_slug()); unique (S1-E2-04).';
comment on column public.profiles.handle_skeleton is
  'The username''s look-alike form (username_skeleton()); unique, so two names can''t look the same (S1-E2-04).';
comment on column public.profiles.handle_changed_at is
  'When the username last changed; null until the first change after setup (S1-E2-04, Q11).';
comment on column public.profiles.pen_name is
  'Optional pen name shown on the person''s content instead of the username; never a legal name is asked for (S1-E2-04).';
comment on column public.profiles.pen_name_changed_at is
  'When the pen name last changed; null until the first change after the first choice (S1-E2-04, Q11).';

create unique index profiles_handle_slug_unique on public.profiles (handle_slug) where handle_slug is not null;
create unique index profiles_handle_skeleton_unique on public.profiles (handle_skeleton) where handle_skeleton is not null;

/**
 * derive_handle_forms: trigger that keeps the slug and skeleton in step with the username.
 * Runs: before insert, and before an update of handle, on profiles. Who writes handles:
 *   set_my_handle() and supabase/seed.sql; both get the same forms this way.
 */
create or replace function public.derive_handle_forms()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.handle_slug := case when new.handle is null then null else public.name_slug(new.handle) end;
  new.handle_skeleton := case when new.handle is null then null else public.username_skeleton(new.handle) end;
  return new;
end;
$$;

comment on function public.derive_handle_forms() is
  'Trigger: stores the web-address and look-alike forms of a username (S1-E2-04).';
revoke execute on function public.derive_handle_forms() from public, anon, authenticated;

create trigger profiles_derive_handle_forms
  before insert or update of handle on public.profiles
  for each row execute function public.derive_handle_forms();

/* ---------- Approvals for false hits ---------- */

create table public.username_approvals (
  id uuid primary key default gen_random_uuid(),
  -- The member whose name was approved (rule 15).
  user_id uuid not null references public.profiles (id),
  name_kind text not null,
  approved_name text not null,
  -- The look-alike form, so the approval covers exactly this name and nothing that merely
  -- contains it.
  approved_skeleton text not null,
  approved_by_user_id uuid not null references public.profiles (id),
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_approvals_kind_is_known check (name_kind in ('handle', 'pen_name')),
  constraint username_approvals_reason_is_given check (btrim(reason) <> '')
);

comment on table public.username_approvals is
  'kind: user_action
A moderator''s approval of one exact username or pen name the word checks refused by mistake (S1-E2-04).';

create index username_approvals_user_id_idx on public.username_approvals (user_id);

create trigger username_approvals_set_updated_at
  before update on public.username_approvals
  for each row execute function public.set_updated_at();

create trigger username_approvals_refuse_user_id_change
  before update on public.username_approvals
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.username_approvals enable row level security;

/**
 * Policy username_approvals_select_staff: owner, admin and moderator read approvals.
 * Why: moderators approve false hits from the account page (S1-E2-04, S1-E11-02); support and
 * content editors have no part in it (architecture 1.8.3, Users: sanctions row).
 */
create policy username_approvals_select_staff
  on public.username_approvals
  for select
  to authenticated
  using (
    (select public.is_staff('owner'))
    or (select public.is_staff('admin'))
    or (select public.is_staff('moderator'))
  );

comment on policy username_approvals_select_staff on public.username_approvals is
  'Allows owner, admin and moderator to read username approvals; they approve false hits (S1-E2-04).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): authenticated may
-- read, and username_approvals_select_staff keeps it to staff. Approvals are written only by
-- admin_approve_username(), which also writes the audit log, so nobody gets a write privilege.
revoke all on public.username_approvals from anon, authenticated;
grant select on public.username_approvals to authenticated;  -- username_approvals_select_staff

/* ---------- The checks ---------- */

/**
 * name_reserved_reason: why a name is reserved, if it is.
 * Input: name. Returns: 'staff' when it imitates staff or the brand, 'system' when it is one of
 *   the app's own addresses, null when it is free of both.
 * Rules: reserved names marked anywhere (and brand names) are refused inside the name when they
 *   have 6 letters or more and as a word of it when shorter; whole_word ones as a word of it;
 *   whole_name ones only as the entire name (see …_s1_e2_04_name_rules.sql).
 */
create or replace function public.name_reserved_reason(name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  matching_words text[] := public.name_matching_words(name);
  whole_name text := matching_words[1];
  reserved_reason text;
begin
  -- Step 1: staff titles and app addresses from reserved_names; staff wins when both match.
  select reserved.reason into reserved_reason
  from public.reserved_names as reserved
  where (reserved.match_rule = 'whole_name' and whole_name = reserved.folded_name)
    or (reserved.match_rule <> 'whole_name' and reserved.folded_name = any (matching_words))
    or (reserved.match_rule = 'anywhere' and char_length(reserved.folded_name) >= 6
        and strpos(whole_name, reserved.folded_name) > 0)
  order by reserved.reason = 'staff' desc
  limit 1;
  if reserved_reason is not null then
    return reserved_reason;
  end if;
  -- Step 2: the brand names from settings, folded the same way, count as imitating staff.
  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(public.setting_value('reserved_brand_words'), '[]')) as brand (word)
    cross join lateral (select (public.name_matching_words(brand.word))[1] as folded) as brand_form
    where brand_form.folded = any (matching_words)
      or (char_length(brand_form.folded) >= 6 and strpos(whole_name, brand_form.folded) > 0)
  ) then
    return 'staff';
  end if;
  return null;
end;
$$;

comment on function public.name_reserved_reason(text) is
  'Internal: staff when a name imitates staff or the brand, system when it is an app address (S1-E2-04).';

/**
 * name_has_listed_word: true when a name holds a word from the English or Romanian swearword lists.
 * Input: name. Returns: a boolean. Words of 4 letters or more marked anywhere are found inside the
 *   name; the others only as a word of it.
 */
create or replace function public.name_has_listed_word(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with forms as (select public.name_matching_words(name) as words)
  select exists (
    select 1
    from public.username_word_lists as listed, forms
    where listed.folded_word <> ''
      and (
        listed.folded_word = any (forms.words)
        or (listed.match_rule = 'anywhere' and char_length(listed.folded_word) >= 4
            and strpos(forms.words[1], listed.folded_word) > 0)
      )
  );
$$;

comment on function public.name_has_listed_word(text) is
  'Internal: true when a name holds a listed swearword, after folding (S1-E2-04).';

/**
 * name_is_approved: true when a moderator approved this exact name for this person.
 * Inputs: target_user_id; name_kind ('handle' or 'pen_name'); name. Returns: a boolean.
 * "Exact" means the same look-alike form, so "Ana.Cunt" approved doesn't approve "ana.cunts".
 */
create or replace function public.name_is_approved(target_user_id uuid, name_kind text, name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.username_approvals as approvals
    where approvals.user_id = target_user_id
      and approvals.name_kind = name_is_approved.name_kind
      and approvals.approved_skeleton = public.username_skeleton(name)
  );
$$;

comment on function public.name_is_approved(uuid, text, text) is
  'Internal: true when a moderator approved this exact name for this person (S1-E2-04).';

revoke execute on function public.name_reserved_reason(text) from public, anon, authenticated;
revoke execute on function public.name_has_listed_word(text) from public, anon, authenticated;
revoke execute on function public.name_is_approved(uuid, text, text) from public, anon, authenticated;

/**
 * name_word_check: the shared word checks for usernames and pen names.
 * Inputs: target_user_id (whose approvals count); name_kind; name.
 * Returns: 'looks_like_staff', 'reserved' (one of the app's own addresses; usernames only),
 *   'not_allowed' or 'ok'. An approval skips the staff and swearword checks, never the addresses.
 */
create or replace function public.name_word_check(target_user_id uuid, name_kind text, name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  reserved_reason text := public.name_reserved_reason(name);
begin
  -- The app's own addresses can't be usernames, even approved: a profile there would clash with
  -- a page. Pen names have no address, so they may be such words.
  if reserved_reason = 'system' and name_kind = 'handle' then
    return 'reserved';
  end if;
  if public.name_is_approved(target_user_id, name_kind, name) then
    return 'ok';
  end if;
  if reserved_reason = 'staff' then
    return 'looks_like_staff';
  end if;
  if public.name_has_listed_word(name) then
    return 'not_allowed';
  end if;
  return 'ok';
end;
$$;

comment on function public.name_word_check(uuid, text, text) is
  'Internal: the staff, brand and swearword checks shared by usernames and pen names (S1-E2-04).';
revoke execute on function public.name_word_check(uuid, text, text) from public, anon, authenticated;

/**
 * check_handle: is this username allowed for the signed-in person?
 * Input: candidate, as typed. Returns one of:
 *   'ok', 'too_short' or 'too_long' (3 to 30 characters), 'invisible_characters', 'spaces',
 *   'looks_like_staff', 'reserved' (one of the app's own addresses), 'not_allowed' (a listed
 *   word), 'taken' (someone has a name that looks the
 *   same, deleted accounts included, so an old name can't be picked up to fake its owner).
 * Who may call it: signed-in people (setup and Settings). It never says who has a name.
 */
create or replace function public.check_handle(candidate text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  word_outcome text;
begin
  -- Step 1: length in characters (code points), the same count the form uses.
  if coalesce(char_length(candidate), 0) < 3 then
    return 'too_short';
  end if;
  if char_length(candidate) > 30 then
    return 'too_long';
  end if;
  -- Step 2: characters used to fake names, then spaces (a username is one word).
  if public.has_invisible_characters(candidate) then
    return 'invisible_characters';
  end if;
  if candidate ~ '[[:space:]\u00A0\u2000-\u200A\u202F\u205F\u3000]' then
    return 'spaces';
  end if;
  -- Step 3: staff, brand and swearwords, unless a moderator approved this exact name.
  word_outcome := public.name_word_check(caller_id, 'handle', candidate);
  if word_outcome <> 'ok' then
    return word_outcome;
  end if;
  -- Step 4: someone else's name that looks the same.
  if exists (
    select 1 from public.profiles
    where profiles.handle_skeleton = public.username_skeleton(candidate)
      and profiles.id is distinct from caller_id
  ) then
    return 'taken';
  end if;
  return 'ok';
end;
$$;

comment on function public.check_handle(text) is
  'Says whether a username is allowed for the signed-in person, and why not (S1-E2-04).';

/**
 * normalise_pen_name: the form a pen name is stored in.
 * Input: pen name as typed. Returns: Unicode NFKC, ordinary spaces only, no spaces at either end
 *   and no runs of spaces; null when nothing is left (no pen name).
 */
create or replace function public.normalise_pen_name(typed_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(regexp_replace(normalize(coalesce(typed_name, ''), nfkc), '[[:space:]]+', ' ', 'g')), '');
$$;

comment on function public.normalise_pen_name(text) is
  'The stored form of a pen name: NFKC, single ordinary spaces, trimmed; null when empty (S1-E2-04).';

/**
 * check_pen_name: is this pen name allowed for the signed-in person?
 * Input: candidate, as typed; empty means "no pen name", which is always allowed.
 * Returns: 'ok', 'too_long' (50 characters at most), 'invisible_characters', 'looks_like_staff',
 *   or 'not_allowed'. Pen names needn't be unique: two writers may share one.
 */
create or replace function public.check_pen_name(candidate text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cleaned_pen_name text := public.normalise_pen_name(candidate);
begin
  if cleaned_pen_name is null then
    return 'ok';
  end if;
  if char_length(cleaned_pen_name) > 50 then
    return 'too_long';
  end if;
  -- Invisible characters are checked on the text as typed, before normalising hides any.
  if public.has_invisible_characters(candidate) then
    return 'invisible_characters';
  end if;
  return public.name_word_check((select auth.uid()), 'pen_name', cleaned_pen_name);
end;
$$;

comment on function public.check_pen_name(text) is
  'Says whether a pen name is allowed for the signed-in person, and why not (S1-E2-04).';

revoke execute on function public.check_handle(text) from public, anon;
revoke execute on function public.check_pen_name(text) from public, anon;
grant execute on function public.check_handle(text) to authenticated;
grant execute on function public.check_pen_name(text) to authenticated;

/* ---------- Saving ---------- */

/**
 * log_account_change: records a member's own change to their account in the audit log.
 * Inputs: target_user_id (who changed it, and whose it is); action_taken; values_before;
 *   values_after. Returns: nothing.
 * Why: moderators must be able to find a person by an earlier username or pen name (S1-E2-04;
 *   architecture 1.6: earlier handles stay in the audit log). Internal: only the set_my_*
 *   functions call it, so nobody can write made-up rows.
 */
create or replace function public.log_account_change(
  target_user_id uuid,
  action_taken text,
  values_before jsonb,
  values_after jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, before_values, after_values)
  values (target_user_id, action_taken, 'profiles', target_user_id::text, target_user_id, values_before, values_after);
$$;

comment on function public.log_account_change(uuid, text, jsonb, jsonb) is
  'Internal: writes a member''s own account change (old and new name) to the audit log (S1-E2-04).';
revoke execute on function public.log_account_change(uuid, text, jsonb, jsonb) from public, anon, authenticated;

comment on column public.audit_log.user_id is
  'Who acted: the staff member, or for a member''s own account change (S1-E2-04) the member.';

/**
 * change_is_too_soon: true when a name changed less than the setting's days ago.
 * Inputs: last_changed_at (null: never changed since the first choice); setting_key.
 */
create or replace function public.change_is_too_soon(last_changed_at timestamptz, setting_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select last_changed_at is not null
    and last_changed_at > now() - make_interval(days => coalesce((public.setting_value(setting_key))::integer, 30));
$$;

comment on function public.change_is_too_soon(timestamptz, text) is
  'Internal: true while a name change is within the waiting days set in settings (S1-E2-04).';
revoke execute on function public.change_is_too_soon(timestamptz, text) from public, anon, authenticated;

/**
 * set_my_handle: saves the signed-in person's username.
 * Input: new_handle, as typed. Returns: 'ok', any refusal from check_handle(), 'too_soon' (changed
 *   less than handle_change_days ago) or 'taken' when someone saved the same name a moment earlier.
 * Errors: insufficient_privilege when signed out or the account is deleted.
 * Rules: the first choice (in setup) doesn't count towards the 30 days; every later change does,
 *   and the old name goes to the audit log (decided 17 Oct 2026, 19:43, Q11).
 */
create or replace function public.set_my_handle(new_handle text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  profile_row public.profiles;
  outcome text;
begin
  -- Step 1: a signed-in person with a live profile.
  select * into profile_row from public.profiles where profiles.id = caller_id and profiles.deleted_at is null;
  if not found then
    raise exception 'Sign in to choose a username.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: nothing to do when the name is the same, character for character.
  if profile_row.handle is not distinct from new_handle then
    return 'ok';
  end if;
  -- Step 3: the waiting time, then the name checks.
  if public.change_is_too_soon(profile_row.handle_changed_at, 'handle_change_days') then
    return 'too_soon';
  end if;
  outcome := public.check_handle(new_handle);
  if outcome <> 'ok' then
    return outcome;
  end if;
  -- Step 4: save; a change after the first choice starts the waiting time and is logged.
  update public.profiles
    set handle = new_handle,
        handle_changed_at = case when profile_row.handle is null then null else now() end
    where profiles.id = caller_id;
  if profile_row.handle is not null then
    perform public.log_account_change(caller_id, 'profile.handle_changed',
      jsonb_build_object('handle', profile_row.handle), jsonb_build_object('handle', new_handle));
  end if;
  return 'ok';
exception
  -- Two people saving look-alike names at the same moment: the unique index lets one through.
  when unique_violation then
    return 'taken';
end;
$$;

comment on function public.set_my_handle(text) is
  'Saves the signed-in person''s username, or says why not (S1-E2-04).';

/**
 * set_my_pen_name: saves (or removes, with an empty value) the signed-in person's pen name.
 * Input: new_pen_name, as typed. Returns: 'ok', any refusal from check_pen_name() or 'too_soon'.
 * Errors: insufficient_privilege when signed out or the account is deleted.
 * Rules: the first pen name is free; every later change, removing it included, waits
 *   pen_name_change_days and is logged (story S1-E2-04; Q11).
 */
create or replace function public.set_my_pen_name(new_pen_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  profile_row public.profiles;
  cleaned_pen_name text := public.normalise_pen_name(new_pen_name);
  is_first_choice boolean;
  outcome text;
begin
  -- Step 1: a signed-in person with a live profile.
  select * into profile_row from public.profiles where profiles.id = caller_id and profiles.deleted_at is null;
  if not found then
    raise exception 'Sign in to choose a pen name.' using errcode = 'insufficient_privilege';
  end if;
  if profile_row.pen_name is not distinct from cleaned_pen_name then
    return 'ok';
  end if;
  -- Step 2: the waiting time (not for the very first pen name), then the name checks.
  is_first_choice := profile_row.pen_name is null and profile_row.pen_name_changed_at is null;
  if not is_first_choice and public.change_is_too_soon(profile_row.pen_name_changed_at, 'pen_name_change_days') then
    return 'too_soon';
  end if;
  outcome := public.check_pen_name(new_pen_name);
  if outcome <> 'ok' then
    return outcome;
  end if;
  -- Step 3: save, and log anything but the first choice.
  update public.profiles
    set pen_name = cleaned_pen_name,
        pen_name_changed_at = case when is_first_choice then null else now() end
    where profiles.id = caller_id;
  if not is_first_choice then
    perform public.log_account_change(caller_id, 'profile.pen_name_changed',
      jsonb_build_object('pen_name', profile_row.pen_name), jsonb_build_object('pen_name', cleaned_pen_name));
  end if;
  return 'ok';
end;
$$;

comment on function public.set_my_pen_name(text) is
  'Saves or removes the signed-in person''s pen name, or says why not (S1-E2-04).';

revoke execute on function public.set_my_handle(text) from public, anon;
revoke execute on function public.set_my_pen_name(text) from public, anon;
grant execute on function public.set_my_handle(text) to authenticated;
grant execute on function public.set_my_pen_name(text) to authenticated;

/**
 * admin_approve_username: a moderator approves one exact name the word checks refused by mistake.
 * Inputs: target_user_id; name_kind ('handle' or 'pen_name'); approved_name; reason_given.
 * Returns: the approval's ID. The person then saves the name themselves; the approval never skips
 *   the length, invisible-character or "taken" checks.
 * Errors: insufficient_privilege unless the caller is owner, admin or moderator with a staff
 *   session; check_violation for a blank reason or an unknown kind.
 * Where it fits: the account page in the admin site (S1-E11-02); the audit log row is written in
 *   the same transaction (architecture 1.8.1).
 */
create or replace function public.admin_approve_username(
  target_user_id uuid,
  name_kind text,
  approved_name text,
  reason_given text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  approval_id uuid;
begin
  -- Step 1: the role, then the staff session (architecture 1.8.1).
  if not (public.is_staff('owner') or public.is_staff('admin') or public.is_staff('moderator'))
    or not public.is_staff_session() then
    raise exception 'Only moderators can approve a name.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: save the approval (the table refuses a blank reason or an unknown kind).
  insert into public.username_approvals (
    user_id, name_kind, approved_name, approved_skeleton, approved_by_user_id, reason
  )
  values (
    target_user_id, name_kind, approved_name, public.username_skeleton(approved_name),
    (select auth.uid()), coalesce(reason_given, '')
  )
  returning id into approval_id;
  -- Step 3: the audit log, in the same transaction.
  perform public.log_staff_action(
    'username.approved', 'username_approvals', approval_id::text, target_user_id, reason_given,
    null, jsonb_build_object('name_kind', name_kind, 'approved_name', approved_name)
  );
  return approval_id;
end;
$$;

comment on function public.admin_approve_username(uuid, text, text, text) is
  'A moderator approves one exact name refused by mistake; logged (S1-E2-04, S1-E11-02).';
revoke execute on function public.admin_approve_username(uuid, text, text, text) from public, anon;
grant execute on function public.admin_approve_username(uuid, text, text, text) to authenticated;

/**
 * display_name: the name shown on a person's content.
 * Inputs: handle; pen_name. Returns: the pen name when there is one, otherwise the username
 *   (S1-E2-04 criterion). The public profile view (S1-E5-05) uses it.
 */
create or replace function public.display_name(handle text, pen_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(btrim(pen_name), ''), handle);
$$;

comment on function public.display_name(text, text) is
  'The pen name when there is one, otherwise the username (S1-E2-04).';

/* ---------- The account gate ---------- */

/**
 * account_state: why an account can or can't write, checked in this order:
 *   deleted (or no profile) → email_unconfirmed → age_check_failed → minor_not_admitted
 *   (adults_only on and under 18, or under 13) → awaiting_parental_consent (under 16) →
 *   age_check_pending (unless adults_only is on and the person is 18 or over by year) →
 *   handle_missing (no username yet, S1-E2-04) → legal_acceptance_required (S1-E14-01) → active.
 * Decisions: the March test is invited adults only, and while adults_only is on an adult is
 * active once the email is confirmed and a username chosen (decided 17 Oct 2026, 12:44; the flag
 * is a proposal). Under-16s need a parent's consent (GDPR Art 8; decided 16 Oct 2026, Q15): until
 * S1-E2-03 adds the consent lookup, every under-16 stays read-only (the safe default).
 * Input: target_user_id. Returns: an account_status value. Errors: none.
 * Not callable by clients: it would reveal other people's age status (privacy).
 */
create or replace function public.account_state(target_user_id uuid)
returns public.account_status
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
  email_confirmed_on timestamptz;
  band public.age_band;
  adults_only boolean := public.is_feature_enabled('adults_only');
begin
  -- Step 1: no live profile, no account.
  select * into profile_row from public.profiles where profiles.id = target_user_id;
  if not found or profile_row.deleted_at is not null then
    return 'deleted';
  end if;

  -- Step 2: the email must be confirmed (S1-E2-01).
  select users.email_confirmed_at into email_confirmed_on
  from auth.users where users.id = target_user_id;
  if email_confirmed_on is null then
    return 'email_unconfirmed';
  end if;

  -- Step 3: the age rules (S1-E2-02, S1-E2-08, S1-E2-03).
  if profile_row.age_check_result = 'failed' then
    return 'age_check_failed';
  end if;
  band := public.age_band_from_birth(
    profile_row.birth_year,
    profile_row.birth_month,
    profile_row.age_check_result,
    (now() at time zone 'Europe/Bucharest')::date
  );
  if band = 'under_13' or (adults_only and band <> '18_plus') then
    return 'minor_not_admitted';
  end if;
  if band = '13_to_15' then
    return 'awaiting_parental_consent';
  end if;
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  -- Step 4: a username, so what the person writes can be shown with a name (S1-E2-04).
  if profile_row.handle is null then
    return 'handle_missing';
  end if;

  -- Step 5: a new important version of the terms or privacy notice must be accepted (S1-E14-01).
  if public.needs_legal_acceptance(target_user_id) then
    return 'legal_acceptance_required';
  end if;

  return 'active';
end;
$$;

comment on function public.account_state(uuid) is
  'Internal: why an account can or cannot write; only active may write (architecture 1.7.8).';
