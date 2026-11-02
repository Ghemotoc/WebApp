-- Database tests for building and sending a data request's copy (bundle ADMIN-2, part c2; story
-- S1-E11-09, part 09a; GDPR art. 12(3), 12(6), 15, 20 and 5(2); ADR 0012).
-- What it proves:
-- - only support, admin and the owner read the person's data for a request, and only once the
--   identity check is done, never after "not me", only for a copy or a move, and never for an
--   under-16's request from outside their account (the parent's path, part c3);
-- - the staff copy holds exactly what Download my data holds, and reading it is logged;
-- - the files go into the private bucket under random names, owned by the person; only staff upload
--   them (policy exports_insert_staff, allowed and denied), the person can't replace or finish
--   them; their sizes come from storage; the person gets a required, emailed notice and downloads
--   them signed in (policy exports_select_own), nobody else does;
-- - staff see names and sizes; opening a file is logged first and only then readable, for that
--   staff member (policy exports_select_staff_opened, allowed and denied);
-- - the log keeps which files were sent, after a second copy and after closing.
-- Personas: adult_writer (…01), teen_17 (…02), kid_14_ok (…03), admin (…09), moderator (…10),
-- support (…11), editor (…12). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(45);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The requests the tests use, by name, and the person's own data file to compare with.
create temp table test_requests (name text primary key, id uuid, reference text);
create temp table opened_files (export_id uuid, file_name text, display_name text);
create temp table own_export (document jsonb);
grant select, insert, delete on test_requests, opened_files, own_export to authenticated;

/* ---------- Setting up: requests in every state ---------- */

-- Support log them; adult_writer answers yes to one and no to another.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
insert into test_requests
select made.name, (made.opened ->> 'id')::uuid, made.opened ->> 'reference'
from (values
  ('confirmed', public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'copy', 'email', current_date, '')),
  ('unchecked', public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'move', 'email', current_date, '')),
  ('denied', public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'copy', 'post', current_date, '')),
  ('to_delete', public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'delete', 'in_app', current_date, '')),
  ('kid_email', public.admin_open_data_request('00000000-0000-4000-8000-000000000003', 'copy', 'email', current_date, '')),
  ('kid_app', public.admin_open_data_request('00000000-0000-4000-8000-000000000003', 'copy', 'in_app', current_date, ''))
) as made (name, opened);
do $$ begin
  perform public.admin_ask_data_request_confirmation(id) from test_requests where name in ('confirmed', 'denied');
end $$;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
do $$ begin
  perform public.answer_data_request(reference, name = 'confirmed') from test_requests where name in ('confirmed', 'denied');
end $$;
insert into own_export select public.my_data_export();

/* ---------- 1. Who may read the person's data, and when ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'confirmed')) $$,
  '42501', null, 'a moderator can''t read a person''s data for a request');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'confirmed')) $$,
  '42501', null, 'the content editor can''t either');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'confirmed')) $$,
  '42501', null, 'nor can the person, through the staff function');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'unchecked')) $$,
  '23514', 'Check the person''s identity first.', 'no copy before the identity check');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'denied')) $$,
  '23514', 'The person said this request wasn''t theirs.', 'no copy when the person said it wasn''t them');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'to_delete')) $$,
  '23514', 'Only a request for a copy, or to move the data, gets a copy.', 'no copy for a request to delete');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'kid_email')) $$,
  '23514', 'This person is under 16: the copy goes through their parent or guardian.',
  'an under-16''s request from outside their account goes to the parent');
select lives_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'kid_app')) $$,
  'a 14-year-old''s own request, made in the app, gets a copy');
select is((select public.admin_data_request_export(id) - 'made_at' from test_requests where name = 'confirmed'),
  (select document - 'made_at' from own_export),
  'the staff copy holds exactly what Download my data gives the person');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'data_request.copy_read'
             and target_id = (select id::text from test_requests where name = 'confirmed')), 1,
  'reading the person''s data is in the audit log');

/* ---------- 2. Opening the files ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'), '[]') $$,
  '23514', null, 'a copy needs at least one file');
select throws_ok($$ select public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'),
  '[{"display_name": "rain.docx"}, {"display_name": "rain.docx"}]') $$,
  '23514', null, 'two files can''t have the same name');
select throws_ok($$ select public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'),
  '[{"display_name": "../rain.docx"}]') $$, '23514', null, 'a name can''t point outside the copy');
select throws_ok($$ select public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'),
  '[{"display_name": "rain.exe"}]') $$, '23514', null, 'only ZIP, Word, JSON and CSV files');

insert into opened_files
select (file ->> 'export_id')::uuid, file ->> 'file_name', file ->> 'display_name'
from jsonb_array_elements(public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'),
  '[{"display_name": "data.json"}, {"display_name": "rain.docx"}, {"display_name": "library.csv"}]')) as file;
select is((select count(*)::integer from opened_files
           where right(file_name, length(display_name) - position('.' in display_name) + 1)
                 = substring(display_name from '\.[a-z]+$')), 3,
  'each file gets a random name with the same ending');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.exports
           where id in (select export_id from opened_files) and user_id = '00000000-0000-4000-8000-000000000001'
             and kind = 'data_request' and state = 'building'), 3,
  'the files belong to the person, being built');

/* ---------- 3. Uploading and finishing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     select 'exports', file_name, auth.uid()::text, '{"size": 10}' from opened_files limit 1 $$,
  '42501', null, 'denied: exports_insert_own: the person can''t fill a copy staff are building');
select throws_ok($$ select public.finish_data_export((select export_id from opened_files limit 1), 0) $$,
  '23514', 'That export isn''t open.', 'the person can''t finish a copy staff are building');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     select 'exports', file_name, auth.uid()::text, '{"size": 10}' from opened_files limit 1 $$,
  '42501', null, 'denied: exports_insert_staff: a moderator can''t upload a data request file');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_finish_data_request_copy((select id from test_requests where name = 'confirmed')) $$,
  '23514', 'A file hasn''t arrived.', 'a copy can''t be sent before its files are uploaded');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     select 'exports', file_name, auth.uid()::text,
       jsonb_build_object('size', case display_name when 'data.json' then 1200 when 'rain.docx' then 3400 else 56 end)
     from opened_files $$,
  'allowed: exports_insert_staff: support upload the files they built');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports' and name in (select file_name from opened_files)), 0,
  'denied: exports_select_staff_opened: staff can''t read the files without opening one');

select is((select jsonb_array_length(public.admin_finish_data_request_copy(id) -> 'files')
           from test_requests where name = 'confirmed'), 3, 'support send the copy: three files ready');
select is((select public.admin_data_request(id) -> 'files' -> 2 ->> 'file_size' from test_requests where name = 'confirmed'),
  '3400', 'each size comes from storage');
select ok((select not (public.admin_data_request(id) -> 'files' -> 0 ? 'file_name') from test_requests where name = 'confirmed'),
  'staff see names and sizes, not where the file is kept');
select is((select public.admin_data_request(id) -> 'copies_sent' -> 0 -> 'files' from test_requests where name = 'confirmed'),
  '[{"name": "data.json", "size": 1200}, {"name": "library.csv", "size": 56}, {"name": "rain.docx", "size": 3400}]'::jsonb,
  'the log keeps which files were sent, with their sizes');

select pg_temp.as_postgres();
select is((select (expires_at - ready_at)::text from public.exports where id = (select export_id from opened_files limit 1)),
  '7 days', 'the files work for seven days');
select is((select count(*)::integer from public.audit_log where action = 'data_request.copy_sent'
             and target_id = (select id::text from test_requests where name = 'confirmed')), 1,
  'sending the copy is in the audit log');
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'data_request_copy_ready'
             and is_required and data_request_id = (select id from test_requests where name = 'confirmed')), 1,
  'the person gets a notice they can''t switch off');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000001', 'data_request_copy_ready'), 'required',
  'the notice is always emailed, to the account''s own address');
select is(public.notification_category('data_request_copy_ready'), 'staff', 'it sits under the team''s notices');

/* ---------- 4. The person downloads it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports' and name in (select file_name from opened_files)), 3,
  'allowed: exports_select_own: the person reads their copy''s files, signed in');
select is((select jsonb_array_length(request -> 'files') from jsonb_array_elements(public.my_data_requests()) as request
           where request ->> 'reference' = (select reference from test_requests where name = 'confirmed')), 3,
  'Settings › Data requests lists the files');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports' and name in (select file_name from opened_files)), 0,
  'denied: exports_select_own: nobody else reads them');

/* ---------- 5. Staff open a file, logged ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_open_data_request_file((select id from test_requests where name = 'confirmed'),
  (select export_id from opened_files where display_name = 'rain.docx')) $$, '42501', null,
  'a moderator can''t open a data request file');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_open_data_request_file((select id from test_requests where name = 'kid_app'),
  (select export_id from opened_files where display_name = 'rain.docx')) $$, '23514', null,
  'a file opens only from its own request');
select is((select public.admin_open_data_request_file(id, (select export_id from opened_files where display_name = 'rain.docx'))
           from test_requests where name = 'confirmed'),
  (select file_name from opened_files where display_name = 'rain.docx'), 'support open one file');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports' and name in (select file_name from opened_files)), 1,
  'allowed: exports_select_staff_opened: that file, and only it, can be read once the opening is logged');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports' and name in (select file_name from opened_files)), 0,
  'denied: exports_select_staff_opened: another staff member who didn''t open it can''t read it');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'data_request.file_opened'
             and user_id = '00000000-0000-4000-8000-000000000011'), 1, 'opening a file is in the audit log');
update public.exports set expires_at = now() - interval '1 minute', ready_at = now() - interval '7 days 1 minute'
where id = (select export_id from opened_files where display_name = 'rain.docx');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports' and name in (select file_name from opened_files)), 0,
  'denied: exports_select_staff_opened: an expired file can''t be read');
select pg_temp.as_postgres();
update public.exports set expires_at = now() + interval '7 days', ready_at = now()
where id = (select export_id from opened_files where display_name = 'rain.docx');

/* ---------- 6. A second copy, and closing ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
delete from opened_files;
insert into opened_files
select (file ->> 'export_id')::uuid, file ->> 'file_name', file ->> 'display_name'
from jsonb_array_elements(public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'),
  '[{"display_name": "D-copy.zip"}]')) as file;
insert into storage.objects (bucket_id, name, owner_id, metadata)
select 'exports', file_name, auth.uid()::text, '{"size": 9000}' from opened_files;
select is((select public.admin_finish_data_request_copy(id) -> 'files' -> 0 ->> 'display_name'
           from test_requests where name = 'confirmed'), 'D-copy.zip', 'a second copy as one ZIP replaces the first');
select is((select jsonb_array_length(public.admin_data_request(id) -> 'copies_sent') from test_requests where name = 'confirmed'),
  2, 'the log keeps both copies sent');

do $$ begin
  perform public.admin_close_data_request(id, 'Sent the copy through the account.') from test_requests where name = 'confirmed';
end $$;
select is((select jsonb_array_length(public.admin_data_request(id) -> 'copies_sent') from test_requests where name = 'confirmed'),
  2, 'a closed request still records which files were sent');
select throws_ok($$ select public.admin_open_data_request_copy((select id from test_requests where name = 'confirmed'),
  '[{"display_name": "data.json"}]') $$, '23514', 'This request is closed.', 'a closed request gets no new copy');

select * from finish();
rollback;
