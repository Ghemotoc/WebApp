/*
 * Data requests: building and sending the copy (bundle ADMIN-2, part c2; story S1-E11-09, part
 * 09a; screen 8.12; GDPR art. 12(3), 12(6), 15, 20 and 5(2); ADR 0012).
 *
 * How it works, the same way as Download my data (ADR 0012: "staff requests build the same ZIP in
 * the staff member's browser from an admin version of my_data_export()"):
 * 1. admin_data_request_export() gives staff exactly what my_data_export() gives the person, found
 *    by the person's user ID, so stories under earlier names, drafts and unpublished chapters are
 *    in (criterion "an export starts"). Reading it is logged.
 * 2. The staff member's browser builds the Word files with the shared Word builder and either one
 *    ZIP of everything or each file on its own (criterion "staff can send one file per story or
 *    one zip of all"), then admin_open_data_request_copy() opens one export per file under random
 *    names. The exports belong to the person: kind data_request, linked to the request.
 * 3. The browser uploads the files (policy exports_insert_staff) and admin_finish_data_request_
 *    copy() marks them ready for seven days, records which files were sent in the request's log
 *    and tells the person, by email too. The person downloads them signed in, from Settings › Data
 *    requests, through the existing exports_select_own policy: nothing goes to any other address.
 * 4. Staff see the file names and sizes. Opening one is possible but logged:
 *    admin_open_data_request_file() writes the audit row, and only then, for five minutes, does
 *    exports_select_staff_opened let that staff member read the file.
 * The copy is refused until the identity check is done (made in the app, or confirmed by the
 * person), for a request about an under-16 that didn't come from their own account (the parent's
 * path is part c3) and for requests that aren't for a copy or to move the data.
 * The nightly clean-up (S1-E13-04) removes the files after their seven days, as for every export.
 *
 * Who calls it: src/features/data-requests (Staff › Data requests › a request, and Settings ›
 * Data requests). What it calls: export_account_of(), export_library_of(), export_tables_of(),
 * log_staff_action(), notify().
 */

/* ---------- 1. Exports made for a data request ---------- */

-- The request a staff copy answers, and the file's name as the person sees it ("rain.docx").
alter table public.exports
  add column data_request_id uuid references public.data_requests (id) on delete cascade,
  add column display_name text;

comment on column public.exports.data_request_id is
  'For data_request: the staff data request this file answers (S1-E11-09).';
comment on column public.exports.display_name is
  'For data_request: the file''s name as the person and staff see it, for example "rain.docx" (S1-E11-09).';

create index exports_data_request_id on public.exports (data_request_id) where data_request_id is not null;

alter table public.exports
  add constraint exports_data_request_fields check (
    (kind = 'data_request') = (data_request_id is not null and display_name is not null)),
  add constraint exports_display_name_shape check (
    display_name is null or display_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(zip|docx|json|csv)$');

-- The file is a ZIP, a Word file, a JSON file or, for a staff copy sent file by file, the library
-- spreadsheet; a staff copy is saved with the same ending as the name the person sees.
alter table public.exports drop constraint exports_file_name_shape;
alter table public.exports add constraint exports_file_name_shape check (
  file_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(zip|docx|json|csv)$'
  and (
    (kind = 'data_request'
      and substring(file_name from '\.([a-z]+)$') = substring(display_name from '\.([a-z]+)$'))
    or (kind <> 'data_request'
      and file_name like '%.' || public.export_file_extension(
        kind, story_id, array[include_chapters, include_plan, include_data]))));

comment on table public.exports is
  'kind: user_action
A copy of someone''s data: all_my_data is one ZIP they asked for (S1-E13-02; GDPR art. 15 and 20); my_stories is the stories they chose (S1-E13-05); data_request is a file staff built for their data request (S1-E11-09). Each sits in the private exports bucket, readable only by them while ready and for seven days. Purged by S1-E13-04.';

-- The bucket also takes the library spreadsheet, for a staff copy sent file by file.
update storage.buckets
set allowed_mime_types = array[
  'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json', 'text/csv']
where id = 'exports';

-- Which copies were sent: when, the names and sizes, until when they worked. Never the files.
alter table public.data_requests
  add column copies_sent jsonb not null default '[]'::jsonb,
  add constraint data_requests_copies_sent_is_list check (jsonb_typeof(copies_sent) = 'array');
comment on column public.data_requests.copies_sent is
  'Every copy sent for the request: sent_at, expires_at and the files'' names and sizes, never their contents (S1-E11-09, "which files were sent").';

/**
 * export_upload_allowed: as in S1-E13-02, but never into a staff copy: the person can't replace a
 * file staff built for their data request (S1-E11-09).
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
      and exports.state = 'building'
      and exports.kind <> 'data_request');
$$;

/**
 * finish_data_export: as in S1-E13-05, but a staff copy is finished only by staff
 * (admin_finish_data_request_copy()), never by the person.
 * Inputs, returns and errors are unchanged.
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
  -- Step 1: the caller's own export, still being built, and not a staff copy.
  select * into open_export from public.exports
  where exports.id = finish_data_export.export_id and exports.user_id = caller_id
    and exports.state = 'building' and exports.kind <> 'data_request';
  if open_export.id is null then
    raise exception 'That export isn''t open.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  -- Step 2: the file is really there; its size comes from storage, not from the browser.
  select (objects.metadata ->> 'size')::bigint into stored_size from storage.objects
  where objects.bucket_id = 'exports' and objects.name = open_export.file_name;
  if stored_size is null then
    raise exception 'The file hasn''t arrived.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 3: older copies of the same kind go; their files go with the nightly sweep (S1-E13-04)
  -- if the browser couldn't delete them.
  delete from public.exports
  where exports.user_id = caller_id and exports.kind = open_export.kind and exports.id <> open_export.id;
  -- Step 4: ready for seven days, and the in-app notice for its kind.
  update public.exports
  set state = 'ready', file_size = stored_size, ready_at = now(), expires_at = now() + interval '7 days',
      story_count = greatest(coalesce(finish_data_export.story_count, 0), 0)
  where exports.id = open_export.id
  returning * into open_export;
  if open_export.kind = 'my_stories' then
    perform public.notify(caller_id, 'stories_export_ready', null, '{}'::jsonb);
  else
    perform public.notify(caller_id, 'data_export_ready', null, '{}'::jsonb);
  end if;
  return jsonb_build_object('expires_at', open_export.expires_at);
end;
$$;

/* ---------- 2. Staff and the files ---------- */

/**
 * export_staff_upload_allowed: may the signed-in staff member add this file to the exports bucket?
 * Only someone who handles data requests, and only under the random name of a staff copy that is
 * still being built (S1-E11-09).
 * Input: the path inside the bucket. Where it fits: the exports_insert_staff policy.
 */
create or replace function public.export_staff_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_may('data_requests', 'act') and exists (
    select 1 from public.exports
    where exports.file_name = object_name
      and exports.kind = 'data_request'
      and exports.state = 'building');
$$;
comment on function public.export_staff_upload_allowed(text) is
  'True when staff who handle data requests upload a data request copy still being built (S1-E11-09).';
revoke execute on function public.export_staff_upload_allowed(text) from public, anon;
grant execute on function public.export_staff_upload_allowed(text) to authenticated;

/**
 * export_staff_open_allowed: may the signed-in staff member read this file? Only a ready,
 * unexpired staff copy, and only for five minutes after they themselves logged opening it with
 * admin_open_data_request_file() (S1-E11-09: "opening a file's contents is possible but logged").
 * Input: the path inside the bucket. Where it fits: the exports_select_staff_opened policy.
 */
create or replace function public.export_staff_open_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_may('data_requests', 'act') and exists (
    select 1 from public.exports
    join public.audit_log on audit_log.target_type = 'exports' and audit_log.target_id = exports.id::text
    where exports.file_name = object_name
      and exports.kind = 'data_request'
      and exports.state = 'ready'
      and exports.expires_at > now()
      and audit_log.action = 'data_request.file_opened'
      and audit_log.user_id = (select auth.uid())
      and audit_log.created_at > now() - interval '5 minutes');
$$;
comment on function public.export_staff_open_allowed(text) is
  'True for five minutes after a staff member logged opening a data request file (S1-E11-09).';
revoke execute on function public.export_staff_open_allowed(text) from public, anon;
grant execute on function public.export_staff_open_allowed(text) to authenticated;

/**
 * Policy exports_insert_staff (files): support, admin and the owner upload the files their browser
 * built for a data request. Why: the copy is built on the staff member's device (ADR 0012), and
 * only into a staff copy still being built, so nobody can fill or replace another export.
 */
create policy exports_insert_staff
  on storage.objects for insert to authenticated
  with check (bucket_id = 'exports' and public.export_staff_upload_allowed(name));

comment on policy exports_insert_staff on storage.objects is
  'Allows staff who handle data requests to upload a data request copy while it is being built (S1-E11-09).';

/**
 * Policy exports_select_staff_opened (files): a staff member reads a data request file for five
 * minutes after logging that they opened it. Why: staff don't need to read the files, but may
 * check one; every look is in the audit log first (S1-E11-09).
 */
create policy exports_select_staff_opened
  on storage.objects for select to authenticated
  using (bucket_id = 'exports' and public.export_staff_open_allowed(name));

comment on policy exports_select_staff_opened on storage.objects is
  'Allows a staff member to read a data request file for five minutes after logging it (S1-E11-09).';

/* ---------- 3. Building the copy ---------- */

/**
 * admin_data_request_copy_target: the checks before staff read or send a copy, on top of
 * admin_data_request_target(): the request is for a copy or to move the data; the identity check
 * is done (made in the app, or confirmed by the person) and wasn't answered "not me"; and a
 * request about an under-16 came from their own account (otherwise it goes through the parent,
 * part c3; GDPR art. 8 and the Civil Code, S1-E11-09 criterion 5).
 * Input: target_request_id. Returns: the open request, locked.
 * Errors: as admin_data_request_target(); check_violation with hint not_a_copy,
 *   identity_denied, identity_not_checked or parent_needed. Internal.
 */
create or replace function public.admin_data_request_copy_target(target_request_id uuid)
returns public.data_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, true);
begin
  if request.request_type not in ('copy', 'move') then
    raise exception 'Only a request for a copy, or to move the data, gets a copy.'
      using errcode = 'check_violation', hint = 'not_a_copy';
  end if;
  -- An under-16's request from outside their own account is the parent's path, whatever the check.
  if request.identity <> 'not_needed' and public.data_request_person_is_under_16(request.user_id) then
    raise exception 'This person is under 16: the copy goes through their parent or guardian.'
      using errcode = 'check_violation', hint = 'parent_needed';
  end if;
  if request.identity = 'denied' then
    raise exception 'The person said this request wasn''t theirs.'
      using errcode = 'check_violation', hint = 'identity_denied';
  end if;
  if request.identity not in ('not_needed', 'confirmed') then
    raise exception 'Check the person''s identity first.'
      using errcode = 'check_violation', hint = 'identity_not_checked';
  end if;
  return request;
end;
$$;
comment on function public.admin_data_request_copy_target(uuid) is
  'Internal: the checks before staff build or send a data request copy (S1-E11-09).';
revoke execute on function public.admin_data_request_copy_target(uuid) from public, anon, authenticated;

/**
 * admin_data_request_export: everything about the request's person, exactly as my_data_export()
 * gives it to them (format data-export/1), so the staff copy and Download my data hold the same.
 * Every story is found by the user ID, so earlier handles and pen names, drafts and unpublished
 * chapters are in (criterion "an export starts"). Reading it is a sensitive read and is logged
 * (architecture 1.8.3).
 * Input: target_request_id. Returns: the data file as jsonb.
 * Errors: as admin_data_request_copy_target().
 * Where it fits: the first step of makeDataRequestCopy() in src/features/data-requests.
 */
create or replace function public.admin_data_request_export(target_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_copy_target(target_request_id);
begin
  perform public.log_staff_action('data_request.copy_read', 'data_requests', request.id::text,
    request.user_id, null, null, null);
  return jsonb_build_object(
    'format', 'data-export/1',
    'made_at', now(),
    'user_id', request.user_id,
    'account', public.export_account_of(request.user_id),
    'library', public.export_library_of(request.user_id),
    'tables', public.export_tables_of(request.user_id));
end;
$$;
comment on function public.admin_data_request_export(uuid) is
  'Staff read a data request''s person''s data, as my_data_export() gives it, logged (S1-E11-09).';
revoke execute on function public.admin_data_request_export(uuid) from public, anon;
grant execute on function public.admin_data_request_export(uuid) to authenticated;

/**
 * admin_open_data_request_copy: opens one export per file the staff member's browser built, each
 * under a random name, owned by the person. A copy started earlier and never finished is replaced.
 * Inputs: target_request_id; files, a JSON array of {"display_name": "rain.docx"} (1 to 500, each
 *   name unique, ending .zip, .docx, .json or .csv).
 * Returns: a JSON array of {export_id, file_name, display_name}: the names to upload under.
 * Errors: as admin_data_request_copy_target(); check_violation with hint bad_files.
 * Where it fits: makeDataRequestCopy(), after the files are built and before they are uploaded.
 */
create or replace function public.admin_open_data_request_copy(target_request_id uuid, files jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_copy_target(target_request_id);
  names text[];
  opened jsonb;
begin
  -- Step 1: the names, checked: a list of 1 to 500 unique names of the allowed kinds.
  if jsonb_typeof(files) <> 'array' then
    raise exception 'Send the list of files.' using errcode = 'check_violation', hint = 'bad_files';
  end if;
  select array_agg(file ->> 'display_name') into names from jsonb_array_elements(files) as file;
  if coalesce(array_length(names, 1), 0) not between 1 and 500
     or (select count(distinct name) from unnest(names) as name) <> array_length(names, 1)
     or exists (select 1 from unnest(names) as name
                where name is null or name !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(zip|docx|json|csv)$') then
    raise exception 'The list of files isn''t right.' using errcode = 'check_violation', hint = 'bad_files';
  end if;
  -- Step 2: an unfinished copy for this request goes; nobody could read its files.
  delete from public.exports
  where exports.data_request_id = request.id and exports.state = 'building';
  -- Step 3: one export per file, owned by the person, under a random name with the same ending.
  with inserted as (
    insert into public.exports (user_id, kind, data_request_id, display_name, file_name)
    select request.user_id, 'data_request', request.id, name,
      gen_random_uuid()::text || '.' || substring(name from '\.([a-z]+)$')
    from unnest(names) as name
    returning exports.id, exports.file_name, exports.display_name
  )
  select jsonb_agg(jsonb_build_object('export_id', inserted.id, 'file_name', inserted.file_name,
      'display_name', inserted.display_name) order by inserted.display_name)
    into opened from inserted;
  return opened;
end;
$$;
comment on function public.admin_open_data_request_copy(uuid, jsonb) is
  'Staff open the files of a data request copy, under random names, before uploading them (S1-E11-09).';
revoke execute on function public.admin_open_data_request_copy(uuid, jsonb) from public, anon;
grant execute on function public.admin_open_data_request_copy(uuid, jsonb) to authenticated;

/**
 * data_request_files_json: the ready, unexpired files of a request, as staff and the person see
 * them: the name, its size and until when it works.
 * Inputs: the request's ID and whether to add the random file name (the person needs it to
 *   download; staff open a file through admin_open_data_request_file() instead).
 * Returns: a JSON array, by name. Internal.
 */
create or replace function public.data_request_files_json(target_request_id uuid, with_file_name boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'export_id', exports.id,
      'display_name', exports.display_name,
      'file_size', exports.file_size,
      'expires_at', exports.expires_at)
      || case when with_file_name then jsonb_build_object('file_name', exports.file_name) else '{}'::jsonb end
      order by exports.display_name), '[]'::jsonb)
  from public.exports
  where exports.data_request_id = target_request_id and exports.state = 'ready'
    and exports.expires_at > now();
$$;
comment on function public.data_request_files_json(uuid, boolean) is
  'Internal: a data request''s ready files, with names and sizes (S1-E11-09).';
revoke execute on function public.data_request_files_json(uuid, boolean) from public, anon, authenticated;

/**
 * admin_finish_data_request_copy: the browser uploaded every file; marks them ready for seven
 * days, replaces any earlier copy for the request, records which files were sent in the request's
 * log and tells the person, also by email to the account's own address (criteria "the files are
 * ready" and "a request is closed").
 * Input: target_request_id. Returns: the request as admin_data_request() gives it.
 * Errors: as admin_data_request_copy_target(); check_violation with hint not_found (no copy being
 *   built) or no_file (a file hasn't arrived).
 * Where it fits: the last step of makeDataRequestCopy().
 */
create or replace function public.admin_finish_data_request_copy(target_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_copy_target(target_request_id);
  sent_files jsonb;
  expires timestamptz := now() + interval '7 days';
begin
  -- Step 1: a copy being built, and every one of its files really there.
  if not exists (select 1 from public.exports
                 where exports.data_request_id = request.id and exports.state = 'building') then
    raise exception 'No copy is being built.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  if exists (select 1 from public.exports
             where exports.data_request_id = request.id and exports.state = 'building'
               and not exists (select 1 from storage.objects
                               where objects.bucket_id = 'exports' and objects.name = exports.file_name)) then
    raise exception 'A file hasn''t arrived.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 2: an earlier copy for this request goes; its files go with the nightly sweep (S1-E13-04).
  delete from public.exports where exports.data_request_id = request.id and exports.state = 'ready';
  -- Step 3: ready for seven days, each size taken from storage, never from the browser.
  update public.exports
  set state = 'ready', ready_at = now(), expires_at = expires,
      file_size = (select (objects.metadata ->> 'size')::bigint from storage.objects
                   where objects.bucket_id = 'exports' and objects.name = exports.file_name)
  where exports.data_request_id = request.id and exports.state = 'building';
  -- Step 4: the log keeps which files were sent, never the files (criterion "a request is closed").
  select jsonb_agg(jsonb_build_object('name', exports.display_name, 'size', exports.file_size)
      order by exports.display_name)
    into sent_files from public.exports where exports.data_request_id = request.id;
  update public.data_requests
  set copies_sent = copies_sent || jsonb_build_array(jsonb_build_object(
        'sent_at', now(), 'expires_at', expires, 'files', sent_files)),
      handled_by_user_id = (select auth.uid())
  where data_requests.id = request.id;
  perform public.log_staff_action('data_request.copy_sent', 'data_requests', request.id::text,
    request.user_id, null, null, jsonb_build_object('files', sent_files, 'expires_at', expires));
  -- Step 5: tell the person; they download it signed in, from Settings › Data requests.
  perform public.notify(request.user_id, 'data_request_copy_ready', null,
    jsonb_build_object('data_request_id', request.id));
  return public.admin_data_request(request.id);
end;
$$;
comment on function public.admin_finish_data_request_copy(uuid) is
  'Staff mark a data request copy ready for seven days, log the files and tell the person (S1-E11-09).';
revoke execute on function public.admin_finish_data_request_copy(uuid) from public, anon;
grant execute on function public.admin_finish_data_request_copy(uuid) to authenticated;

/**
 * admin_open_data_request_file: staff open one file of a request's copy. Possible, but logged
 * first, because staff don't need to read it (criterion "staff see the file names and sizes").
 * The storage policy exports_select_staff_opened then lets this staff member read it for five
 * minutes. Works on a closed request too, while the file lasts.
 * Inputs: target_request_id, target_export_id. Returns: the file's random name in the bucket.
 * Errors: as admin_data_request_target(); check_violation with hint not_found (not a ready,
 *   unexpired file of this request).
 * Where it fits: DataRequestFiles → useDataRequestCopy → api/dataRequestCopy.ts → here.
 */
create or replace function public.admin_open_data_request_file(target_request_id uuid, target_export_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_requests := public.admin_data_request_target(target_request_id, false);
  chosen public.exports;
begin
  select * into chosen from public.exports
  where exports.id = target_export_id and exports.data_request_id = request.id
    and exports.state = 'ready' and exports.expires_at > now();
  if chosen.id is null then
    raise exception 'That file isn''t there any more.' using errcode = 'check_violation', hint = 'not_found';
  end if;
  perform public.log_staff_action('data_request.file_opened', 'exports', chosen.id::text,
    request.user_id, null, null,
    jsonb_build_object('data_request_id', request.id, 'file', chosen.display_name));
  return chosen.file_name;
end;
$$;
comment on function public.admin_open_data_request_file(uuid, uuid) is
  'Staff open a data request file, logged first (S1-E11-09).';
revoke execute on function public.admin_open_data_request_file(uuid, uuid) from public, anon;
grant execute on function public.admin_open_data_request_file(uuid, uuid) to authenticated;

/* ---------- 4. Reading a request ---------- */

/**
 * admin_data_request: as in ADMIN-2c1, plus the person's language (so the Word files are in it),
 * the ready files with their names and sizes, and every copy sent.
 * Input: target_request_id. Returns: the request as JSON.
 * Errors: as admin_data_request_target().
 * Where it fits: StaffDataRequestPage → useStaffDataRequest → api/dataRequests.ts → here.
 */
create or replace function public.admin_data_request(target_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request public.data_requests;
begin
  -- Step 1: the same checks as every action, without needing it to be open or locking it.
  if not public.staff_may('data_requests', 'act') then
    raise exception 'You can''t handle data requests.' using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  select * into request from public.data_requests where data_requests.id = target_request_id;
  if not found then
    raise exception 'There is no such request.' using errcode = 'check_violation', hint = 'no_such_request';
  end if;
  -- Step 2: the request as the staff screen shows it, with its files and what was sent.
  return public.data_request_json(request) || jsonb_build_object(
    'language', (select profiles.locale from public.profiles where profiles.id = request.user_id),
    'files', public.data_request_files_json(request.id, false),
    'copies_sent', request.copies_sent);
end;
$$;

/**
 * my_data_requests: as in ADMIN-2c1, plus the files of a copy sent for each request, which the
 * person downloads signed in while they last (criterion "the files are ready").
 * Returns: JSON array, newest first. Errors: insufficient_privilege when signed out.
 * Where it fits: MyDataRequestsSection → useMyDataRequests → api/myDataRequests.ts → here.
 */
create or replace function public.my_data_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your requests.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'reference', requests.reference,
        'request_type', requests.request_type,
        'channel', requests.channel,
        'received_on', requests.received_on,
        'deadline', public.data_request_deadline(requests),
        'extension_reason', requests.extension_reason,
        'identity', requests.identity,
        'state', requests.state,
        'files', public.data_request_files_json(requests.id, true))
      order by requests.received_on desc, requests.created_at desc)
    from public.data_requests as requests
    where requests.user_id = (select auth.uid())), '[]'::jsonb);
end;
$$;

/* ---------- 5. The notification ---------- */

/**
 * notify: as in ADMIN-2c1, plus data_request_copy_ready as required: the person can't switch off
 * hearing that the copy they asked for is ready (GDPR art. 12(3)). Inputs, return and callers are
 * unchanged.
 */
create or replace function public.notify(
  recipient_id uuid, notification_kind public.notification_kind, actor_id uuid, about jsonb,
  group_key text default null, group_window interval default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grouped public.notifications;
begin
  -- Step 1: never one's own action, never across a block.
  if recipient_id is null or recipient_id = actor_id then
    return;
  end if;
  if actor_id is not null and exists (
      select 1 from public.blocks
      where (blocks.user_id = recipient_id and blocks.blocked_user_id = actor_id)
         or (blocks.user_id = actor_id and blocks.blocked_user_id = recipient_id)) then
    return;
  end if;
  -- Step 2: a fresh grouped row takes the new person instead of a new row.
  if notify.group_key is not null then
    select * into grouped from public.notifications
    where notifications.user_id = recipient_id and notifications.group_key = notify.group_key
      and notifications.created_at > now() - group_window
    order by notifications.created_at desc limit 1
    for update;
    if grouped.id is not null then
      if actor_id = any (grouped.actor_user_ids) then
        return;
      end if;
      update public.notifications set
        actor_user_ids = (array[actor_id] || grouped.actor_user_ids)[1:50],
        actor_count = grouped.actor_count + 1,
        read_at = null,
        updated_at = now()
      where notifications.id = grouped.id;
      return;
    end if;
  end if;
  -- Step 3: a new row; a decision, an appeal's outcome or a staff change can't be switched off
  -- (DSA art. 17, 20; S1-E11-08), nor can a data request's notice (GDPR art. 12; S1-E11-09).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id,
    story_revision_id, data_request_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, (about ->> 'data_request_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff', 'data_request_confirm',
                          'data_request_extended', 'data_request_copy_ready'));
end;
$$;

/**
 * notification_category: as in ADMIN-2c1, plus data_request_copy_ready under staff.
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
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    else 'replies'
  end;
$$;

/**
 * email_delivery_for: as in ADMIN-2c1, plus data_request_copy_ready, always emailed to the
 * account's own address: the person must hear the copy is ready even when they don't sign in, and
 * it has only seven days (GDPR art. 12(3); S1-E11-09).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended', 'data_request_copy_ready') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;
