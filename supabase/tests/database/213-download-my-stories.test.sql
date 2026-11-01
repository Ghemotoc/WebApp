-- Database tests for Download my stories (story S1-E13-05).
-- What it proves:
-- - criterion 1: a writer opens a copy of one story (a single .docx) or all of them (a .zip);
--   only their own live stories, and not when they have none;
-- - criterion 2: finishing it makes it ready for seven days and sends stories_export_ready; a
--   Download my data copy is never touched by it, and the other way round;
-- - criterion 3: a suspended writer can still ask;
-- - criterion 4: the same request within 24 hours offers the earlier files, unless the story
--   changed since (proposal);
-- - the exports rules: a Download my data copy can't name a story.
-- The storage and row policies are S1-E13-02's (tests 210); they read either kind the same way.
-- Personas: adult_writer (…01, two stories), teen_17 (…02, one story), kid_14_ok (…03, none),
-- suspended_user (…13). Test data: exports, Storage rows and one story; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_suffix text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', '00000000-0000-4000-8000-0000000000' || persona_suffix, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The file the browser would upload, as Storage records it.
create function pg_temp.upload(file_name text) returns void language sql as $$
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('exports', file_name, '00000000-0000-4000-8000-000000000001', '{"size": 2048}'::jsonb);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
create temp table answers (label text primary key, answer jsonb);
grant all on answers to authenticated;

/* ---------- Asking (criterion 1) ---------- */

select pg_temp.sign_in('01');
insert into answers values
  ('one', public.request_stories_export('00000000-0000-4000-9000-000000000001'));
select is((select answer ->> 'outcome' from answers where label = 'one'), 'new',
  'a writer opens a copy of one of their stories');
select ok((select answer ->> 'file_name' from answers where label = 'one') like '%.docx',
  'one story is a single Word file');
insert into answers values ('all', public.request_stories_export());
select ok((select answer ->> 'file_name' from answers where label = 'all') like '%.zip',
  'all the writer''s stories come in one ZIP of Word files');
select is((select count(*)::integer from public.exports where kind = 'my_stories' and state = 'building'), 1,
  'asking again replaces the copy still being made, so one is open at a time');

select throws_ok($$ select public.request_stories_export('00000000-0000-4000-9000-000000000003') $$,
  '23514', null, 'a writer can''t download someone else''s story');
select pg_temp.sign_in('03');
select throws_like($$ select public.request_stories_export() $$, '%no story of yours%',
  'a reader with no stories is told there is nothing to download');

/* ---------- Finishing (criterion 2) ---------- */

select pg_temp.sign_in('01');
delete from answers;
insert into answers values
  ('one', public.request_stories_export('00000000-0000-4000-9000-000000000001')),
  ('data', public.request_data_export());
select pg_temp.as_owner();
select pg_temp.upload((select answer ->> 'file_name' from answers where label = 'one'));
select pg_temp.upload((select answer ->> 'file_name' from answers where label = 'data'));
select pg_temp.sign_in('01');

select lives_ok(
  $$ select public.finish_data_export((select (answer ->> 'export_id')::uuid from answers where label = 'one'), 1) $$,
  'the writer finishes the Word file once it is uploaded');
select results_eq(
  $$ select state::text, file_size, expires_at = ready_at + interval '7 days'
     from public.exports where id = (select (answer ->> 'export_id')::uuid from answers where label = 'one') $$,
  $$ values ('ready'::text, 2048::bigint, true) $$,
  'it is ready, its size taken from Storage, and it works for seven days');
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'stories_export_ready'), 1,
  'the writer is told their Word files are ready');
select is((select state::text from public.exports where kind = 'all_my_data'), 'building',
  'a Download my data copy being made at the same time is left alone');

select lives_ok(
  $$ select public.finish_data_export((select (answer ->> 'export_id')::uuid from answers where label = 'data'), 2) $$,
  'the data copy still finishes as before');
select is((select count(*)::integer from public.exports where state = 'ready'), 2,
  'one copy of each kind is kept: the Word file and the data copy');

/* ---------- The same request again (criterion 4) ---------- */

insert into answers values
  ('again', public.request_stories_export('00000000-0000-4000-9000-000000000001'));
select is((select answer ->> 'export_id' from answers where label = 'again'),
  (select answer ->> 'export_id' from answers where label = 'one'),
  'asking again within 24 hours offers the files already made');

-- The copy was made an hour ago and the writer has edited the story since.
select pg_temp.as_owner();
update public.exports set ready_at = now() - interval '1 hour', expires_at = now() + interval '6 days'
where id = (select (answer ->> 'export_id')::uuid from answers where label = 'one');
update public.stories set blurb = blurb || ' ' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('01');
insert into answers values
  ('edited', public.request_stories_export('00000000-0000-4000-9000-000000000001'));
select is((select answer ->> 'outcome' from answers where label = 'edited'), 'new',
  'after an edit a new copy is made, so the Word file has the newest words');

/* ---------- A suspended writer (criterion 3) ---------- */

select pg_temp.as_owner();
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, cover_kind, rating, ai_disclosure)
values ('00000000-0000-4000-9000-000000000213', '00000000-0000-4000-8000-000000000013', 'kept-213', 'Kept',
        'A story of a suspended writer.', 'en', (select id from public.categories where slug = 'fiction'),
        'automatic', 'all_ages', 'no_ai');
select is(public.account_state('00000000-0000-4000-8000-000000000013'), 'suspended',
  'suspended_user is suspended');
select pg_temp.sign_in('13');
select is((public.request_stories_export('00000000-0000-4000-9000-000000000213')) ->> 'outcome', 'new',
  'a suspended writer can still download their stories');

/* ---------- The rules of the table ---------- */

select pg_temp.as_owner();
select throws_ok(
  $$ insert into public.exports (user_id, kind, story_id, file_name)
     values ('00000000-0000-4000-8000-000000000001', 'all_my_data', '00000000-0000-4000-9000-000000000001',
             gen_random_uuid()::text || '.zip') $$,
  '23514', null, 'a Download my data copy can''t name a story');

select * from finish();
rollback;
