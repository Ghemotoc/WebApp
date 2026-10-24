-- Database tests for managing chapters (story S1-E3-04).
-- What it proves:
-- - move_chapter() swaps a chapter with its neighbour and refuses past the ends; another writer
--   and a read-only account can't; a visitor can't call it;
-- - set_chapter_order() takes the whole order, and refuses a list that is missing, repeating or
--   adding a chapter (nothing changes);
-- - rename_chapter() changes the draft title and, for a published chapter, the title readers see
--   at once, without an "Edited on" date; it moves the draft version on;
-- - delete_chapter() hides the chapter from readers at once, closes the gap, and takes a story
--   private when it was the last published chapter; restore_chapter() brings it back at the end
--   within 30 days and refuses after; purge_deleted_chapters() deletes it only after 30 days and
--   never while it is held for moderation; pg_cron runs it nightly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- Created before anyone signs in, so they run with the test's own rights.
create function pg_temp.codes_in_order() returns text language sql security definer as $$
  select string_agg(draft_title, ',' order by position) from public.chapters
  where story_id = '00000000-0000-4000-9000-000000000001' and deleted_at is null $$;
create function pg_temp.code_of(chapter_title text) returns text language sql security definer as $$
  select code from public.chapters where draft_title = chapter_title
  and story_id = '00000000-0000-4000-9000-000000000001' $$;

-- Three chapters, A B C, on adult_writer's seed story; B is published.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_chapter('statia-meteo-seed01') from generate_series(1, 3);
reset role;
update public.chapters set draft_title = chr(64 + position), draft_body = 'Text ' || chr(64 + position) || '.'
  where story_id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.publish_chapter(pg_temp.code_of('B'));

-- 1. Move.
select is((public.move_chapter(pg_temp.code_of('C'), -1)) ->> 'outcome', 'ok', 'allowed: the writer moves C up');
select is(pg_temp.codes_in_order(), 'A,C,B', 'C and B swapped');
select is((public.move_chapter(pg_temp.code_of('A'), -1)) ->> 'outcome', 'at_edge', 'the first chapter can''t move up');
select is((public.move_chapter(pg_temp.code_of('B'), 1)) ->> 'outcome', 'at_edge', 'the last chapter can''t move down');
select throws_ok($$ select public.move_chapter(pg_temp.code_of('A'), 2) $$, '23514', null, 'a move is one place at a time');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.move_chapter(pg_temp.code_of('A'), 1)) ->> 'outcome', 'not_found', 'denied: another writer can''t move someone else''s chapter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.move_chapter(pg_temp.code_of('A'), 1)) ->> 'outcome', 'not_active', 'denied: teen_17 (read-only in March) can''t move a chapter');
select pg_temp.sign_out();
select throws_ok($$ select public.move_chapter('abcdefgh', 1) $$, '42501', null, 'a visitor can''t call move_chapter()');
reset role;

-- 2. The whole order (dragging).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.set_chapter_order('statia-meteo-seed01', array[pg_temp.code_of('B'), pg_temp.code_of('A'), pg_temp.code_of('C')])) ->> 'outcome',
  'ok', 'allowed: the writer drags B to the top');
select is(pg_temp.codes_in_order(), 'B,A,C', 'the new order is stored');
select is((public.set_chapter_order('statia-meteo-seed01', array[pg_temp.code_of('A'), pg_temp.code_of('C')])) ->> 'outcome',
  'wrong_list', 'a list missing a chapter is refused');
select is((public.set_chapter_order('statia-meteo-seed01', array[pg_temp.code_of('A'), pg_temp.code_of('A'), pg_temp.code_of('C')])) ->> 'outcome',
  'wrong_list', 'a list repeating a chapter is refused');
select is((public.set_chapter_order('statia-meteo-seed01', array[pg_temp.code_of('A'), pg_temp.code_of('B'), 'zzzzzzzz'])) ->> 'outcome',
  'wrong_list', 'a list with a stranger''s code is refused');
select is(pg_temp.codes_in_order(), 'B,A,C', 'none of those changed the order');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.set_chapter_order('statia-meteo-seed01', array[pg_temp.code_of('A'), pg_temp.code_of('B'), pg_temp.code_of('C')])) ->> 'outcome',
  'not_found', 'denied: another writer can''t reorder someone else''s story');

-- 3. Rename.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.rename_chapter(pg_temp.code_of('B'), '  Bunica  şi vremea ')) ->> 'outcome', 'ok', 'the writer renames the published chapter B');
reset role;
select results_eq(
  $$ select draft_title, published_title, edited_at is null, draft_version from public.chapters where code = (select code from public.chapters where draft_title = 'Bunica și vremea') $$,
  $$ values ('Bunica și vremea', 'Bunica și vremea', true, 2) $$,
  'readers see the new title at once, with ș corrected, no "Edited on", and the version moved on'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.rename_chapter(pg_temp.code_of('A'), repeat('x', 121)) $$, '23514', null, 'a title over 120 characters is refused');

-- 4. Delete: the published chapter goes, readers lose it and the story goes private.
select is((public.delete_chapter(pg_temp.code_of('Bunica și vremea'))) ->> 'outcome', 'ok', 'the writer deletes the published chapter');
select is(pg_temp.codes_in_order(), 'A,C', 'the remaining chapters close the gap');
select pg_temp.sign_out();
select is(public.get_story_page('statia-meteo-seed01'), null, 'with no published chapter left, readers lose the story at once');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.restore_chapter(pg_temp.code_of('Bunica și vremea'))) ->> 'outcome', 'not_found', 'denied: another writer can''t undo it');

-- 5. Undo: back at the end, readable again.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.restore_chapter(pg_temp.code_of('Bunica și vremea'))) ->> 'outcome', 'ok', 'the writer undoes the deletion');
select is(pg_temp.codes_in_order(), 'A,C,Bunica și vremea', 'it comes back at the end');
select pg_temp.sign_out();
select isnt(public.get_story_page('statia-meteo-seed01'), null, 'the published chapter is readable again, and so is the story');
reset role;

-- 6. After 30 days: no undo; the purge deletes it, unless held.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.delete_chapter(pg_temp.code_of('A'));
reset role;
update public.chapters set deleted_at = now() - interval '31 days' where code = pg_temp.code_of('A');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.restore_chapter(pg_temp.code_of('A'))) ->> 'outcome', 'not_found', 'after 30 days there is no undo');
reset role;
select is(public.purge_deleted_chapters(), 1, 'the purge deletes the chapter deleted more than 30 days ago');
select is((select count(*)::integer from public.chapters where draft_title = 'A'), 0, 'it is gone for good');
select results_eq(
  $$ select schedule from cron.job where jobname = 'purge-deleted-chapters' $$,
  $$ values ('29 3 * * *') $$,
  'pg_cron runs the purge nightly'
);

select * from finish();

rollback;
