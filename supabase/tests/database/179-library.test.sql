-- Database tests for the reader's library and their place in every chapter (story S1-E4-03).
-- What it proves:
-- - library_entries and reading_positions are readable by their owner only (allowed and denied
--   tests for both policies), and a signed-out visitor can't save anything;
-- - saving a place keeps it, puts the story on "Reading" and moves it to "Finished" at the end of
--   a completed story; reading a saved story moves it to "Reading";
-- - a writer's own story never fills their library; a story behind a block can't be saved;
-- - the Library button puts a story on a shelf and takes it off, and the shelves list as story
--   lists for their owner only;
-- - my_library(), my_place_in_chapter(), story_library_state() and my_follows() answer the
--   caller's own library.
-- Test data: two stories by adult_writer (one completed, two chapters each) and one by blocker,
-- read by teacher and blocked; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- The slugs on one of the caller's shelves, in address order.
create function pg_temp.shelf(shelf_name text) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by story ->> 'slug'), '')
  from jsonb_array_elements(public.browse_stories('library', shelf_name) -> 'stories') as story;
$$;
-- Moves every saved place a minute back, as the test's own role: a transaction has one clock,
-- so without this every save in the test would carry the same time.
create function pg_temp.age_places() returns void language plpgsql as $$
declare
  caller_claims text := current_setting('request.jwt.claims', true);
begin
  perform set_config('role', 'postgres', true);
  set local session_replication_role = replica;
  update public.reading_positions set updated_at = updated_at - interval '1 minute';
  set local session_replication_role = origin;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', caller_claims, true);
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;
-- Answers the test doesn't check go here.
create temporary table discarded (answer jsonb);
grant all on discarded to authenticated;

-- Two live stories by adult_writer: lib1 completed, lib2 ongoing, two chapters each; one by
-- blocker, whom blocked can't see.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
  completion_status, first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9179-000000000001', '00000000-0000-4000-8000-000000000001', 'lib1', 'Biblioteca unu', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', 'completed', now(), now()),
  ('00000000-0000-4000-9179-000000000002', '00000000-0000-4000-8000-000000000001', 'lib2', 'Biblioteca doi', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now(), now()),
  ('00000000-0000-4000-9179-000000000003', '00000000-0000-4000-8000-000000000015', 'lib3', 'Biblioteca trei', 'ro',
   (select id from public.categories where slug = 'fiction'), 'all_ages', 'ongoing', now(), now());
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'lib' || right(stories.slug, 1) || 'ch0' || place, place, 'C', 'Text.', 1,
  'published', 'C' || place, 'Text.', 1, now()
from public.stories cross join generate_series(1, 2) as place
where stories.id::text like '00000000-0000-4000-9179-%';

/* ---------- 1. Saving a place ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.save_reading_position('lib1', 'lib1ch01', 40, 'phone') $$), '42501',
  'a signed-out visitor can''t save a place');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.save_reading_position('lib1', 'lib1ch01', 40, 'phone') ->> 'shelf', 'reading',
  'the first place saved puts the story on "Reading"');
select is(public.my_place_in_chapter('lib1', 'lib1ch01') ->> 'percent', '40',
  'the reader finds their place in the chapter again');
select pg_temp.age_places();
select is(public.save_reading_position('lib1', 'lib1ch02', 100, 'computer') ->> 'shelf', 'finished',
  'the end of the last chapter of a completed story moves it to "Finished"');
select is(public.save_reading_position('lib2', 'lib2ch02', 100, 'tablet') ->> 'shelf', 'reading',
  'the end of an ongoing story keeps it on "Reading"');
select is(pg_temp.refusal($$ select public.save_reading_position('lib1', 'lib1ch01', 40, 'toaster') $$), '22023',
  'an unknown kind of device is refused');

-- RLS: the owner reads their rows.
select is((select count(*)::integer from public.reading_positions), 3,
  'allowed: reading_positions_select_own (the reader sees their own places)');
select is((select count(*)::integer from public.library_entries), 2,
  'allowed: library_entries_select_own (the reader sees their own library)');

/* ---------- 2. Nobody else sees it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.reading_positions where user_id = '00000000-0000-4000-8000-000000000007'), 0,
  'denied: reading_positions_select_own (the writer can''t see a reader''s places)');
select is((select count(*)::integer from public.library_entries where user_id = '00000000-0000-4000-8000-000000000007'), 0,
  'denied: library_entries_select_own (the writer can''t see a reader''s library)');
select is(pg_temp.shelf('finished'), '', 'nobody else''s shelf is ever listed');
select is(public.save_reading_position('lib2', 'lib2ch01', 50, 'phone') -> 'shelf', 'null'::jsonb,
  'a writer''s own story never fills their library');

/* ---------- 3. The Library button and the shelves ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_library_shelf('lib2', 'saved') ->> 'shelf', 'saved', 'the reader saves a story for later');
select is(pg_temp.shelf('saved') || ' | ' || pg_temp.shelf('finished'), 'lib2 | lib1', 'each shelf lists its own stories');
select pg_temp.age_places();
select is(public.save_reading_position('lib2', 'lib2ch01', 10, 'phone') ->> 'shelf', 'reading',
  'reading a saved story moves it to "Reading"');
select is(public.set_library_shelf('lib2', null) -> 'shelf', 'null'::jsonb, 'the reader takes a story off their shelves');
select is(public.story_library_state('lib2') #>> '{place,chapter_code}', 'lib2ch01',
  'the place is kept after the story leaves the library');
insert into discarded select public.set_library_shelf('lib2', 'reading');

select is((public.my_library() -> 'counts') || jsonb_build_object('first', public.my_library() #>> '{continue_reading,0,story,slug}'),
  '{"reading": 1, "saved": 0, "finished": 1, "first": "lib2"}'::jsonb,
  'the Library counts each shelf and offers the latest story to continue');
select is(public.my_library() #> '{places,lib1}', '{"number": 2, "total": 2}'::jsonb,
  'each card knows the chapter the reader reached');

/* ---------- 4. Blocks and follows ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(pg_temp.refusal($$ select public.set_library_shelf('lib3', 'saved') $$), 'P0002',
  'a story by someone either side blocks can''t be saved');
select is(pg_temp.refusal($$ select public.save_reading_position('lib3', 'lib3ch01', 5, 'phone') $$), 'P0002',
  'and no place can be kept in it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into discarded select public.follow_writer('adult_writer', true);
select ok(public.my_follows() -> 'writers' @> '[{"handle": "adult_writer"}]',
  'the Library lists the writers the reader follows');

select * from finish();
rollback;
