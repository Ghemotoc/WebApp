/*
 * Download my data (story S1-E13-02; board Settings 6.3, the Download my data tab; GDPR art. 15
 * and art. 20; ADR 0012).
 *
 * How it works (ADR 0012, a proposal): the person's own browser builds the ZIP, because a
 * Cloudflare Pages Function on the free plan has 10 ms of processor time, far too little for Word
 * files and a ZIP. The database decides everything that matters:
 * - request_data_export() opens an export for the signed-in person and gives it a random file name
 *   (never the user ID, architecture 1.6);
 * - my_data_export() answers everything about the account as one JSON document: the user ID, the
 *   account (email, ways to log in, the profile with the year of birth and the age check result,
 *   date and method) and the person's rows of every user-content and user-action table, from the
 *   one list data_export_tables(). The browser turns that JSON into the data file and, with the
 *   shared Word builder (src/lib/word/), one Word file per story, and zips them;
 * - the ZIP goes to the private exports bucket; the storage policies let the person add it only to
 *   their own open export and read it back only while it is ready and less than seven days old;
 * - before finishing, the browser deletes the files of the person's older copies (it can while
 *   they are ready and unexpired); finish_data_export() then checks the new file is there, marks
 *   the export ready for seven days, drops the older rows and sends the in-app notification.
 * Expired rows stop working at once (the read policy checks the date); the nightly clean-up of
 * expired exports and their files is S1-E13-04.
 * Who calls it: src/features/data-export/ (Settings › Download my data). S1-E11-09a (staff data
 * requests) and S1-E13-05 (Download my stories) reuse the same pieces.
 */

/* ---------- The exports ---------- */

create type public.export_kind as enum ('all_my_data');
comment on type public.export_kind is
  'What an export holds: all_my_data is S1-E13-02''s ZIP; S1-E13-05 adds its own kind.';

create type public.export_state as enum ('building', 'ready');
comment on type public.export_state is
  'building: the browser is making the file; ready: it can be downloaded until expires_at (S1-E13-02).';

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  -- Whose data it is; only they can read it (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.export_kind not null,
  state public.export_state not null default 'building',
  -- The file's name in the exports bucket: a random "<uuid>.zip", never the user ID.
  file_name text not null unique,
  -- Taken from the stored file, never from the browser's word.
  file_size bigint,
  -- How many Word files the ZIP holds, for the line on the Settings screen.
  story_count integer,
  ready_at timestamptz,
  -- Seven days after ready_at (criterion 3).
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exports_file_name_shape check (
    file_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.zip$'),
  constraint exports_ready_together check (
    (state = 'ready') = (ready_at is not null and expires_at is not null and file_size is not null)),
  constraint exports_story_count_positive check (story_count is null or story_count >= 0)
);

comment on table public.exports is
  'kind: user_action
A copy of someone''s data that they asked for: one ZIP in the private exports bucket, readable only by them while ready and for seven days (S1-E13-02; GDPR art. 15 and 20). Purged by S1-E13-04.';
comment on column public.exports.user_id is
  'The person whose data it is; never shown publicly (rule 15).';
comment on column public.exports.file_name is
  'The ZIP''s random name in the exports bucket ("<uuid>.zip"), never the user ID (architecture 1.6).';

create index exports_user_id on public.exports (user_id, created_at desc);
create index exports_expires_at on public.exports (expires_at) where state = 'ready';

create trigger exports_set_updated_at
  before update on public.exports
  for each row execute function public.set_updated_at();

create trigger exports_refuse_user_id_change
  before update on public.exports
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.exports enable row level security;

-- The person reads their own exports; every write goes through the functions below.
grant select on public.exports to authenticated;

/**
 * Policy exports_select_own: the signed-in person reads their own exports. Why: Settings shows
 * whether a copy is being made or ready, and until when (criterion 3). Nobody else, staff
 * included, reads them here; staff requests are S1-E11-09a's own path.
 */
create policy exports_select_own
  on public.exports for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy exports_select_own on public.exports is
  'Allows a person to read their own data exports (S1-E13-02).';

/* ---------- The bucket ---------- */

-- Private. 200 MB is a proposal: a writer with many long stories and pictures stays well under it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exports', 'exports', false, 209715200, array['application/zip'])
on conflict (id) do nothing;

/**
 * export_upload_allowed: may the signed-in person add this file to the exports bucket? Only under
 * the random name of one of their own exports that is still being built.
 * Input: the path inside the bucket. Where it fits: the exports_insert_own policy.
 */
create or replace function public.export_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exports
    where exports.file_name = object_name
      and exports.user_id = (select auth.uid())
      and exports.state = 'building');
$$;

comment on function public.export_upload_allowed(text) is
  'True when the file is the caller''s own export that is still being built (S1-E13-02).';
revoke execute on function public.export_upload_allowed(text) from public, anon;
grant execute on function public.export_upload_allowed(text) to authenticated;

/**
 * export_download_allowed: may the signed-in person read this file? Only their own export, only
 * once it is ready and only until it expires (criterion 3: the link needs sign-in and stops
 * working after seven days).
 * Input: the path inside the bucket. Where it fits: the exports_select_own policy on the files.
 */
create or replace function public.export_download_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exports
    where exports.file_name = object_name
      and exports.user_id = (select auth.uid())
      and exports.state = 'ready'
      and exports.expires_at > now());
$$;

comment on function public.export_download_allowed(text) is
  'True when the file is the caller''s own ready export that hasn''t expired (S1-E13-02).';
revoke execute on function public.export_download_allowed(text) from public, anon;
grant execute on function public.export_download_allowed(text) to authenticated;

/**
 * Policy exports_insert_own (files): the person adds the ZIP their browser built. Why: the file is
 * built on their device (ADR 0012); only into their own open export, so nobody can fill someone
 * else's.
 */
create policy exports_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'exports' and public.export_upload_allowed(name));

comment on policy exports_insert_own on storage.objects is
  'Allows a person to add the ZIP of their own export while it is being built (S1-E13-02).';

/**
 * Policy exports_select_own (files): the person downloads their own ready copy for seven days.
 * Why: criterion 3; signing in is needed because the download address is signed for the person's
 * session and lasts one minute.
 */
create policy exports_select_own
  on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.export_download_allowed(name));

comment on policy exports_select_own on storage.objects is
  'Allows a person to download their own ready, unexpired export (S1-E13-02).';

/**
 * Policy exports_delete_own (files): the person deletes files they uploaded. Why: a new copy
 * replaces the older ones, so the browser deletes their files instead of keeping a second copy of
 * the person's data (GDPR art. 5(1)(e)). Postgres also applies the read policy to a delete, so
 * this works only while the file is readable (ready and unexpired); an expired file is the
 * nightly clean-up's (S1-E13-04).
 */
create policy exports_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'exports' and owner_id = (select auth.uid())::text);

comment on policy exports_delete_own on storage.objects is
  'Allows a person to delete the export files they uploaded (S1-E13-02).';

/* ---------- What goes in ---------- */

/**
 * data_export_tables: every table that holds a person's content or actions, and whether
 * my_data_export() includes their rows. The one list: database test 210 fails when a table whose
 * comment says "kind: user_content" or "kind: user_action" is missing from it, so each later
 * content type adds itself (the story's "each later content type adds itself to the export").
 * A table is left out only with a reason; staff tables are not listed (the person gets each
 * decision through its statement of reasons, which is included).
 * Returns: table_name, is_included and, for one left out, why. Internal: my_data_export().
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: which user tables Download my data includes, and why any is left out (S1-E13-02).';
revoke execute on function public.data_export_tables() from public, anon, authenticated;

/**
 * export_row_for_owner: one of the person's rows, made safe to hand to them.
 * - Other people's user IDs are never shown (architecture 1.6), so every *_user_id and
 *   *_user_ids field goes; the person someone follows, blocked, wrote to or reported is named by
 *   their current username instead (followed_handle and so on), because that is what they chose.
 * - Secrets go: *_hash, *_token and *_key fields.
 * - parent_email goes: it is the parent's address, not the child's data (GDPR art. 15(4)), and
 *   staff's internal decision_note on an appeal goes (the person's answer is message_to_person).
 * - handle_skeleton goes: an internal folded form of the username.
 * Input: the row as jsonb. Returns: the row without those fields. Internal: my_data_export().
 */
create or replace function public.export_row_for_owner(stored_row jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cleaned jsonb := '{}'::jsonb;
  field record;
  named_field text;
begin
  -- Step 1: the people the person chose to follow, block, write to or report, by username.
  foreach named_field in array array['followed_user_id', 'blocked_user_id', 'recipient_user_id', 'reported_user_id'] loop
    if stored_row ? named_field then
      cleaned := cleaned || jsonb_build_object(
        replace(named_field, '_user_id', '_handle'),
        (select profiles.handle from public.profiles
         where profiles.id = (stored_row ->> named_field)::uuid));
    end if;
  end loop;
  -- Step 2: every other field, unless it is someone else's ID, a secret or an internal note.
  for field in select key, value from jsonb_each(stored_row) loop
    continue when field.key ~ '_user_ids?$';
    continue when field.key ~ '(_hash|_token|_key)$';
    continue when field.key in ('parent_email', 'decision_note', 'handle_skeleton');
    cleaned := cleaned || jsonb_build_object(field.key, field.value);
  end loop;
  return cleaned;
end;
$$;

comment on function public.export_row_for_owner(jsonb) is
  'Internal: drops other people''s IDs, secrets and internal notes from a row for its owner (S1-E13-02).';
revoke execute on function public.export_row_for_owner(jsonb) from public, anon, authenticated;

/**
 * export_account_of: the account part of the data file (criterion 2): the email address, when it
 * was confirmed, the ways to log in (providers only), and the profile with the year of birth, the
 * age check result, date and method and every setting.
 * Input: the person's user ID. Returns: jsonb. Internal: my_data_export().
 */
create or replace function public.export_account_of(owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'email', users.email,
    'email_confirmed_at', users.email_confirmed_at,
    'signed_up_at', users.created_at,
    'ways_to_log_in', coalesce(
      (select jsonb_agg(distinct identities.provider order by identities.provider)
       from auth.identities where identities.user_id = owner_id), '[]'::jsonb),
    'profile', (select public.export_row_for_owner(to_jsonb(profiles))
                from public.profiles where profiles.id = owner_id))
  from auth.users
  where users.id = owner_id;
$$;

comment on function public.export_account_of(uuid) is
  'Internal: the account part of Download my data (S1-E13-02).';
revoke execute on function public.export_account_of(uuid) from public, anon, authenticated;

/**
 * export_tables_of: the person's rows of every included table, by table name, oldest first.
 * Input: the person's user ID. Returns: { "<table>": [rows] }. Internal: my_data_export().
 * Why dynamic SQL: the list of tables is data (data_export_tables()), so a new table needs one new
 * line there, not a new query here; format('%I') quotes each name safely.
 */
create or replace function public.export_tables_of(owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  entry record;
  table_rows jsonb;
begin
  for entry in select listed.table_name from public.data_export_tables() as listed
               where listed.is_included order by listed.table_name loop
    execute format(
      'select coalesce(jsonb_agg(public.export_row_for_owner(to_jsonb(owned)) order by owned.created_at), ''[]''::jsonb)
       from public.%I as owned where owned.user_id = $1', entry.table_name)
      into table_rows using owner_id;
    result := result || jsonb_build_object(entry.table_name, table_rows);
  end loop;
  return result;
end;
$$;

comment on function public.export_tables_of(uuid) is
  'Internal: the person''s rows of every table Download my data includes (S1-E13-02).';
revoke execute on function public.export_tables_of(uuid) from public, anon, authenticated;

/**
 * my_data_export: everything about the signed-in account, as the machine-readable data file
 * (criteria 1 and 2; GDPR art. 20: structured, commonly used and machine-readable).
 * Returns: { format: 'data-export/1', made_at, user_id, account, tables }. The browser adds one
 *   Word file per story from tables.stories and tables.chapters.
 * Errors: insufficient_privilege (hint signed_out) when signed out.
 * Where it fits: the first step of buildDataExport() in src/features/data-export/. A suspended
 * account can still ask (GDPR art. 15 doesn't stop for a sanction; S1-E10-06).
 */
create or replace function public.my_data_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  return jsonb_build_object(
    'format', 'data-export/1',
    'made_at', now(),
    'user_id', caller_id,
    'account', public.export_account_of(caller_id),
    'tables', public.export_tables_of(caller_id));
end;
$$;

comment on function public.my_data_export() is
  'Everything about the signed-in account as one JSON document, for Download my data (S1-E13-02).';
revoke execute on function public.my_data_export() from public, anon;
grant execute on function public.my_data_export() to authenticated;

/* ---------- Asking and finishing ---------- */

-- Three requests an hour, for new and older accounts alike (a proposal): building one is work for
-- the person's own device, so the limit only stops a runaway screen from filling the bucket.
update public.settings
  set value = value || '{"data_export": {"new_account": 3, "older_account": 3}}'::jsonb
  where key = 'rate_limits';

/**
 * request_data_export: opens a new export for the signed-in person (criterion 1). An export still
 * being built (a closed tab, say) is replaced, so asking again always works.
 * Returns: { export_id, file_name }: the name to upload the ZIP under.
 * Errors: insufficient_privilege (hint signed_out) when signed out; the rate limit's error after
 *   three requests in an hour.
 * Where it fits: buildDataExport() calls it first, then my_data_export().
 */
create or replace function public.request_data_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  new_export public.exports;
begin
  -- Step 1: at most three an hour.
  perform public.take_rate_limit('data_export');
  -- Step 2: an unfinished one goes; it never had a file anyone could read.
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = 'all_my_data' and exports.state = 'building';
  -- Step 3: the new one, under a random file name.
  insert into public.exports (user_id, kind, file_name)
  values (caller_id, 'all_my_data', gen_random_uuid()::text || '.zip')
  returning * into new_export;
  return jsonb_build_object('export_id', new_export.id, 'file_name', new_export.file_name);
end;
$$;

comment on function public.request_data_export() is
  'Opens a new Download my data export for the signed-in person (S1-E13-02).';
revoke execute on function public.request_data_export() from public, anon;
grant execute on function public.request_data_export() to authenticated;

/**
 * finish_data_export: the browser uploaded the ZIP (and deleted the older copies' files); marks
 * the export ready for seven days, tells the person (criterion 3) and drops the older rows.
 * Inputs: export_id; story_count (how many Word files the ZIP holds, 0 or more).
 * Returns: { expires_at }.
 * Errors: insufficient_privilege when signed out; check_violation with hint not_found (not the
 *   caller's open export) or no_file (nothing uploaded under its name).
 */
create or replace function public.finish_data_export(export_id uuid, story_count integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  open_export public.exports;
  stored_size bigint;
begin
  -- Step 1: the caller's own export, still being built.
  select * into open_export from public.exports
  where exports.id = finish_data_export.export_id and exports.user_id = caller_id
    and exports.state = 'building';
  if open_export.id is null then
    raise exception 'That export isn''t open.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  -- Step 2: the file is really there; its size comes from storage, not from the browser.
  select (objects.metadata ->> 'size')::bigint into stored_size from storage.objects
  where objects.bucket_id = 'exports' and objects.name = open_export.file_name;
  if stored_size is null then
    raise exception 'The file hasn''t arrived.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 3: older copies go, so only one copy of the person's data is kept. A file the browser
  -- couldn't delete is left for the nightly clean-up (S1-E13-04).
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = 'all_my_data' and exports.id <> open_export.id;
  -- Step 4: ready for seven days (criterion 3), and the in-app notice.
  update public.exports
  set state = 'ready', file_size = stored_size, ready_at = now(), expires_at = now() + interval '7 days',
      story_count = greatest(coalesce(finish_data_export.story_count, 0), 0)
  where exports.id = open_export.id
  returning * into open_export;
  perform public.notify(caller_id, 'data_export_ready', null, '{}'::jsonb);
  return jsonb_build_object('expires_at', open_export.expires_at);
end;
$$;

comment on function public.finish_data_export(uuid, integer) is
  'Marks the caller''s uploaded export ready for seven days and tells them (S1-E13-02).';
revoke execute on function public.finish_data_export(uuid, integer) from public, anon;
grant execute on function public.finish_data_export(uuid, integer) to authenticated;

/* ---------- The notification ---------- */

/**
 * notification_category: as in S1-E2-11, with data_export_ready under the team's chip ("staff"):
 * it is an account notice from us, not from another member (S1-E13-02).
 * Input: the kind. Returns: 'stories', 'follows', 'staff' or 'replies'. Internal: my_notifications().
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    else 'replies'
  end;
$$;
