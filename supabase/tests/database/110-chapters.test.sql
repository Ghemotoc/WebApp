-- Database tests for the chapters tables (story S1-E3-02a; ADR 0004).
-- What it proves:
-- - the chapters and chapter_revisions tables have the shape the editor needs, carry the
--   writer's user ID and are reportable as 'chapter';
-- - create_chapter() adds chapters at the end of the caller's own story with a fresh 8-character
--   code; another writer gets not_found; read-only accounts get not_active; a visitor is refused;
-- - the owner reads their chapters (allowed) and nobody else does (denied: another writer, a
--   moderator, a visitor); nobody writes the table through the API; the revisions policy the same;
-- - the owner column can't drift from the story's owner (the trigger);
-- - deleting a story takes its chapters along, and undo brings exactly those back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- 1. The shape.
select has_table('public', 'chapters', 'the chapters table exists');
select has_table('public', 'chapter_revisions', 'the chapter_revisions table exists');
select col_not_null('public', 'chapters', 'user_id', 'every chapter has a writer (rule 15)');
select col_default_is('public', 'chapters', 'draft_version', '1', 'a new chapter starts at version 1');
select col_default_is('public', 'chapters', 'status', 'draft', 'a new chapter is a draft');
select is((select enum_range(null::public.reportable_type)::text[] @> array['chapter']), true,
  'chapters are reportable (rule 6)');
select has_index('public', 'chapters', 'chapters_story_position_idx', 'the chapter list has its index');

-- 2. create_chapter(): the owner adds two chapters; they are numbered 1 and 2 with 8-character codes.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.create_chapter('statia-meteo-seed01')) ->> 'outcome', 'ok', 'allowed: the writer adds a chapter to their story');
select is((public.create_chapter('statia-meteo-seed01')) ->> 'position', '2', 'the second chapter is number 2');
select results_eq(
  $$ select position, code ~ '^[a-z0-9]{8}$', draft_title, draft_version from public.chapters
     where story_id = '00000000-0000-4000-9000-000000000001' order by position $$,
  $$ values (1, true, '', 1), (2, true, '', 1) $$,
  'allowed: chapters_select_own: the writer reads their own chapters, in order, with 8-character codes'
);
select is((public.create_chapter('no-such-story')) ->> 'outcome', 'not_found', 'an unknown address gives not_found');

-- 3. Another writer: not_found, and no rows visible.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.create_chapter('statia-meteo-seed01')) ->> 'outcome', 'not_found',
  'another writer can''t add a chapter to a story that isn''t theirs');
select is((select count(*)::integer from public.chapters where story_id = '00000000-0000-4000-9000-000000000001'), 0,
  'denied: chapters_select_own: another writer sees none of them');
select is((select count(*)::integer from public.chapter_revisions), 0,
  'denied: chapter_revisions_select_own: another writer sees no revisions');

-- 4. Read-only accounts and visitors.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select is((public.create_chapter('statia-meteo-seed01')) ->> 'outcome', 'not_active',
  'kid_14_waiting (waiting for a parent) can''t add a chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.chapters), 0, 'denied: chapters_select_own: a moderator reads no chapters through the table');
select pg_temp.sign_out();
select throws_ok($$ select public.create_chapter('statia-meteo-seed01') $$, '42501', null,
  'a signed-out visitor can''t call create_chapter()');
select throws_ok($$ select * from public.chapters $$, '42501', null, 'a signed-out visitor can''t read the chapters table');

-- 5. Nobody writes the tables through the API.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into public.chapters (story_id, user_id, code, position)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'abcdefgh', 9) $$,
  '42501', null, 'even the writer can''t insert a chapter directly');
select throws_ok($$ update public.chapters set draft_title = 'x' $$, '42501', null, 'nor update one directly');
select throws_ok($$ insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
  select id, user_id, user_id, 'edited', '', '' from public.chapters limit 1 $$,
  '42501', null, 'allowed/denied: chapter_revisions_select_own is read-only: nobody inserts a revision through the API');

-- 6. The owner column follows the story (the trigger), checked as the superuser; and a revision
--    written the way S1-E3-03 will write it is readable by the writer.
reset role;
insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
select id, user_id, user_id, 'published', 'Capitolul unu', 'Text' from public.chapters
where story_id = '00000000-0000-4000-9000-000000000001' order by position limit 1;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.chapter_revisions), 1,
  'allowed: chapter_revisions_select_own: the writer reads the revisions of their own chapter');
reset role;
select throws_ok($$ insert into public.chapters (story_id, user_id, code, position)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000007', 'zzzzzzzz', 9) $$,
  '23514', null, 'a chapter can''t belong to anyone but the story''s writer');

-- 7. Deleting the story takes the chapters along; undo brings them back.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.delete_my_story('statia-meteo-seed01')) ->> 'outcome', 'ok', 'the writer deletes the story');
select is((select count(*)::integer from public.chapters
  where story_id = '00000000-0000-4000-9000-000000000001' and deleted_at is not null), 2,
  'both chapters are deleted with it');
select is((public.restore_my_story('statia-meteo-seed01')) ->> 'outcome', 'ok', 'the writer undoes it');
select is((select count(*)::integer from public.chapters
  where story_id = '00000000-0000-4000-9000-000000000001' and deleted_at is null), 2,
  'both chapters are back');

select * from finish();

rollback;
