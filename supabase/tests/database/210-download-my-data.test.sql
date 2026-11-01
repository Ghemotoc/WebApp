-- Database tests for Download my data (story S1-E13-02; GDPR art. 15 and 20; ADR 0012).
-- What it proves:
-- - criterion 1: request_data_export() opens an export under a random file name, never the user
--   ID; asking again replaces one still being built; my_data_export() holds the stories,
--   chapters, comments, sent messages and settings, only the caller's rows;
-- - criterion 2: it holds the user ID and the account (email, username, pen name, year of birth,
--   the age check result, date and method, consents) and the reports the person made, without
--   other people's IDs (the reported person is named by username) or secrets;
-- - criterion 3: finish_data_export() needs the uploaded file, marks it ready for seven days,
--   sends the notification and lets go of older copies; the file can be read only by its owner,
--   only while ready and unexpired;
-- - the one list data_export_tables() covers every user_content and user_action table, so a new
--   content type can't be forgotten;
-- - policies: exports_select_own (table), exports_insert_own, exports_select_own and
--   exports_delete_own (files): allowed and denied.
-- Personas: adult_writer (…01), teen_17 (…02), blocker (…15, blocks blocked …16).
-- Test data: one story, chapter, comment, message and report by adult_writer; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000' || persona_suffix
           || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- Every key anywhere inside a JSON document, so a test can look for a forbidden one.
create function pg_temp.all_keys(document jsonb) returns setof text language sql as $$
  with recursive walk(value) as (
    select document
    union all
    select child.value from walk,
      lateral (select each.value from jsonb_each(case when jsonb_typeof(walk.value) = 'object' then walk.value else '{}' end) as each
               union all
               select element.value from jsonb_array_elements(case when jsonb_typeof(walk.value) = 'array' then walk.value else '[]' end) as element) as child)
  select each.key from walk, lateral jsonb_each(case when jsonb_typeof(walk.value) = 'object' then walk.value else '{}' end) as each;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Test data by adult_writer: a story with one chapter, a comment, a message to teen_17 and a
-- report about blocker's profile.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, completion_status)
values ('00000000-0000-4000-9210-000000000001', '00000000-0000-4000-8000-000000000001', 'export1',
  'Țara de sub ape', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing');
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count, status)
values ('00000000-0000-4000-9210-000000000002', '00000000-0000-4000-9210-000000000001',
  '00000000-0000-4000-8000-000000000001', 'exp1ch01', 1, 'Începutul', 'Ș și ț.', 3, 'draft');
insert into public.comments (user_id, chapter_id, body)
values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9210-000000000002', 'Not mine.');
insert into public.conversations (id, user_id, recipient_user_id, status)
values ('00000000-0000-4000-9210-000000000003', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'accepted');
insert into public.messages (user_id, conversation_id, body)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9210-000000000003', 'Salut!'),
       ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9210-000000000003', 'Not mine either.');
insert into public.reports (user_id, item_type, item_id, reported_user_id, reason, reporter_age_band, source, reference)
values ('00000000-0000-4000-8000-000000000001', 'profile', '00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000015', 'spam', '18_plus', 'in_app', 'R-EXPORT-1');

/* ---------- 1. The one list ---------- */

select pg_temp.as_owner();
select is(
  (select coalesce(string_agg(classes.relname, ', ' order by classes.relname), '')
   from pg_class as classes join pg_namespace on pg_namespace.oid = classes.relnamespace
   where pg_namespace.nspname = 'public' and classes.relkind = 'r'
     and obj_description(classes.oid) ~ '^kind: (user_content|user_action)'
     and classes.relname <> 'exports'
     and classes.relname not in (select listed.table_name from public.data_export_tables() as listed)),
  '', 'every user_content and user_action table is in data_export_tables(), included or left out');
select is(
  (select count(*)::integer from public.data_export_tables() as listed
   where not listed.is_included and coalesce(listed.why_left_out, '') = ''), 0,
  'every table left out says why');
select is(
  (select count(*)::integer from public.data_export_tables() as listed
   where to_regclass('public.' || listed.table_name) is null), 0, 'every listed table exists');

/* ---------- 2. Asking ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.request_data_export() $$, '42501', null,
  'signed out, nobody can ask for an export');
select throws_ok($$ select public.my_data_export() $$, '42501', null,
  'signed out, nobody can read the data file');

select pg_temp.sign_in('01');
select ok(public.request_data_export() ->> 'file_name' ~ '^[0-9a-f-]{36}\.zip$',
  'an export gets a random ZIP name');
select isnt((select file_name from public.exports limit 1), '00000000-0000-4000-8000-000000000001.zip',
  'the file name is never the user ID');
select ok(public.request_data_export() ->> 'export_id' is not null, 'asking again works');
select is((select count(*)::integer from public.exports), 1,
  'allowed: exports_select_own: the person sees their one open export; the unfinished one was replaced');

select pg_temp.sign_in('02');
select is((select count(*)::integer from public.exports), 0,
  'denied: exports_select_own: someone else sees nobody''s exports');

/* ---------- 3. What the data file holds ---------- */

select pg_temp.sign_in('01');
create temporary table export_document on commit drop as select public.my_data_export() as document;
grant select on export_document to authenticated;

select is((select document ->> 'user_id' from export_document), '00000000-0000-4000-8000-000000000001',
  'criterion 2: the data file holds the user ID');
select is((select document #>> '{account,email}' from export_document), 'adult_writer@personas.test',
  'criterion 2: and the email address');
select is((select document #>> '{account,profile,handle}' from export_document), 'adult_writer',
  'criterion 2: and the username');
select ok((select document #> '{account,profile}' ?& array['pen_name', 'birth_year', 'age_check_result',
  'age_checked_at', 'age_check_method'] from export_document),
  'criterion 2: and the pen name, year of birth and the age check result, date and method');
select ok((select jsonb_array_length(document #> '{tables,consents}') > 0 from export_document),
  'criterion 2: and the consents');
select ok((select document #> '{tables,stories}' @> '[{"title": "Țara de sub ape"}]' from export_document),
  'criterion 1: the stories, Romanian letters intact');
select ok((select document #> '{tables,chapters}' @> '[{"draft_body": "Ș și ț."}]' from export_document),
  'criterion 1: the chapters, drafts included');
select is((select count(*)::integer from export_document,
  jsonb_array_elements(document #> '{tables,comments}') as comment
  where comment ->> 'user_id' <> '00000000-0000-4000-8000-000000000001'), 0,
  'criterion 1: only the person''s own comments');
select ok((select document #> '{tables,messages}' @> '[{"body": "Salut!"}]'
  and not document #> '{tables,messages}' @> '[{"body": "Not mine either."}]' from export_document),
  'criterion 1: the messages they sent, not the ones they received');
select ok((select document -> 'tables' ? 'reading_settings' and document -> 'tables' ? 'notification_email_settings'
  from export_document), 'criterion 1: the settings');
select ok((select document #> '{tables,reports}' @> '[{"reference": "R-EXPORT-1", "reported_handle": "blocker"}]'
  from export_document), 'criterion 2: the reports they made, naming the reported person by username');
select is(
  (select count(*)::integer from export_document, pg_temp.all_keys(document) as found_key
   where found_key ~ '(_user_ids?|_hash|_token)$' or found_key in ('parent_email', 'decision_note')), 0,
  'no other person''s user ID and no secret anywhere in the file');
select ok((select document #> '{tables,conversations}' @> '[{"recipient_handle": "teen_17"}]' from export_document),
  'the person they wrote to is named by username');

/* ---------- 4. The file ---------- */

select throws_ok(
  $$ select public.finish_data_export((select id from public.exports limit 1), 1) $$,
  '23514', 'The file hasn''t arrived.', 'an export can''t be finished before its file is uploaded');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     values ('exports', '11111111-1111-4111-8111-111111111111.zip', auth.uid()::text, '{"size": 10}') $$,
  '42501', null, 'denied: exports_insert_own: no file under a name that isn''t the person''s open export');

select pg_temp.sign_in('02');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     values ('exports', %L, auth.uid()::text, '{"size": 10}') $$,
     (select file_name from public.exports limit 1)),
  '42501', null, 'denied: exports_insert_own: nobody can fill someone else''s export');

select pg_temp.as_owner();
create temporary table open_export_name on commit drop as select file_name from public.exports limit 1;
grant select on open_export_name to authenticated;

select pg_temp.sign_in('01');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     select 'exports', file_name, auth.uid()::text, '{"size": 2048}' from open_export_name $$,
  'allowed: exports_insert_own: the person uploads the ZIP of their open export');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'), 0,
  'denied: exports_select_own (files): the file can''t be read while it is still being built');
select ok(public.finish_data_export((select id from public.exports limit 1), 1) ->> 'expires_at' is not null,
  'criterion 3: finishing works once the file is there');
select is((select row(state, file_size, story_count, expires_at = ready_at + interval '7 days')::text
  from public.exports), '(ready,2048,1,t)', 'criterion 3: ready for seven days, its size from storage');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'), 1,
  'allowed: exports_select_own (files): the owner reads their ready copy');
select is((select count(*)::integer from public.notifications
  where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'data_export_ready'), 1,
  'criterion 3: the person is notified');

select pg_temp.sign_in('02');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'), 0,
  'denied: exports_select_own (files): nobody else reads it');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'exports';
select pg_temp.as_owner();
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'), 1,
  'denied: exports_delete_own: someone else''s delete leaves the file where it is');

select pg_temp.as_owner();
update public.exports set ready_at = now() - interval '8 days', expires_at = now() - interval '1 day';
select pg_temp.sign_in('01');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'), 0,
  'criterion 3: after seven days the file can''t be read any more');
select pg_temp.as_owner();
update public.exports set ready_at = now(), expires_at = now() + interval '7 days';
select pg_temp.sign_in('01');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'exports';
select pg_temp.as_owner();
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'), 0,
  'allowed: exports_delete_own: the person deletes their own file');

select * from finish();
rollback;
