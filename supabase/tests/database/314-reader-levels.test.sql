-- Database tests for reader levels (bundle G7a; Robert approved them on 7 Nov 2026, 19:53 UTC;
-- tests and the switch from the DESIGN thread, 7 Nov 2026, 19:56 UTC).
-- What it proves:
-- - the rule: New reader at the first chapter read, Reader at 50 chapters, Bookworm at 10 stories
--   finished, Story devourer at 40; nothing before the first chapter;
-- - a chapter counts at 95 per cent, a story when the last chapter of a completed story is read,
--   and a writer's own chapters never count;
-- - the owner always sees their own level; others see it only once the owner shows it, never
--   across a block, and the counts behind it are never readable directly (allowed and denied);
-- - the switch in Settings › Privacy starts hidden, is saved only by the signed-in member and
--   shows in my_privacy_settings().
-- Personas: adult_writer (…01, writes the stories), teen_17 (…02, writes one), blocker (…15, the
-- reader, who blocks …16) and blocked (…16).
-- Test data: three stories with four chapters and the reader's places in them; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Three stories: A (completed, two chapters) and C (ongoing, one chapter) by adult_writer, and
-- B (completed, one chapter) by teen_17.
insert into public.stories (id, user_id, title, slug, rating, language_code, category_id,
  completion_status, first_published_at, last_chapter_published_at)
values
  ('00000000-0000-4000-9314-00000000000a', '00000000-0000-4000-8000-000000000001', 'Level A',
   'level-a-qa314', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'),
   'completed', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-4000-9314-00000000000b', '00000000-0000-4000-8000-000000000002', 'Level B',
   'level-b-qa314', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'),
   'completed', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-4000-9314-00000000000c', '00000000-0000-4000-8000-000000000001', 'Level C',
   'level-c-qa314', 'all_ages', 'ro', (select id from public.categories where slug = 'fiction'),
   'ongoing', now() - interval '3 days', now() - interval '3 days');
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body,
  word_count, status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9314-0000000000a1', '00000000-0000-4000-9314-00000000000a',
   '00000000-0000-4000-8000-000000000001', 'q314aa01', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '3 days'),
  ('00000000-0000-4000-9314-0000000000a2', '00000000-0000-4000-9314-00000000000a',
   '00000000-0000-4000-8000-000000000001', 'q314aa02', 2, 'Doi', 'x', 1, 'published', 'Doi', 'Text.', 1, now() - interval '3 days'),
  ('00000000-0000-4000-9314-0000000000b1', '00000000-0000-4000-9314-00000000000b',
   '00000000-0000-4000-8000-000000000002', 'q314bb01', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '3 days'),
  ('00000000-0000-4000-9314-0000000000c1', '00000000-0000-4000-9314-00000000000c',
   '00000000-0000-4000-8000-000000000001', 'q314cc01', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '3 days');

-- The reader (blocker) finished A, got halfway through B and read all of ongoing C; the writer
-- read her own chapter A1 to the end.
insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
values
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9314-00000000000a', '00000000-0000-4000-9314-0000000000a1', 100, 'computer'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9314-00000000000a', '00000000-0000-4000-9314-0000000000a2', 96, 'computer'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9314-00000000000b', '00000000-0000-4000-9314-0000000000b1', 50, 'phone'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9314-00000000000c', '00000000-0000-4000-9314-0000000000c1', 100, 'phone'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9314-00000000000a', '00000000-0000-4000-9314-0000000000a1', 100, 'computer');

-- 1 to 7: the rule from counts to a level.
select is(public.reader_level_from(0, 0), null, 'nobody has a level before their first chapter read');
select is(public.reader_level_from(1, 0), 'new_reader', 'the first chapter read makes a New reader');
select is(public.reader_level_from(49, 9), 'new_reader', '49 chapters and 9 stories is still New reader');
select is(public.reader_level_from(50, 0), 'reader', '50 chapters read makes a Reader');
select is(public.reader_level_from(0, 10), 'bookworm', '10 stories finished makes a Bookworm');
select is(public.reader_level_from(500, 39), 'bookworm', 'chapters alone never pass Bookworm');
select is(public.reader_level_from(0, 40), 'story_devourer', '40 stories finished makes a Story devourer');

-- 8: everyone starts hidden.
select is((select count(*)::integer from public.profiles where shows_reader_level), 0,
  'every reading level starts hidden');

-- 9 to 11: the owner sees their own, with the counts.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.profile_reader_level('blocker') ->> 'level', 'new_reader',
  'allowed: the reader sees their own level while it is hidden');
select is((public.profile_reader_level('blocker') ->> 'chapters_read')::integer, 3,
  'three chapters count: 95 per cent or more, and the half-read one does not');
select is((public.profile_reader_level('blocker') ->> 'stories_finished')::integer, 1,
  'one story counts: the completed one read to the end, not the ongoing one');

-- 12: a writer's own chapters never count.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.profile_reader_level('adult_writer') ->> 'chapters_read', '0',
  'a writer reading their own chapter earns nothing');

-- 13 and 14: hidden means hidden to others.
select is(public.profile_reader_level('blocker'), null,
  'denied: another member sees nothing while the level is hidden');
select pg_temp.sign_out();
select is(public.profile_reader_level('blocker'), null,
  'denied: a visitor sees nothing while the level is hidden');

-- 15 and 16: only a signed-in member saves the switch, and the counts are never readable directly.
select throws_ok($$ select public.set_shows_reader_level(true) $$, '42501', null,
  'denied: a visitor can''t change anyone''s switch');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select * from public.reader_level_counts('00000000-0000-4000-8000-000000000015') $$,
  '42501', null, 'denied: nobody reads someone''s counts directly');

-- 17 and 18: the reader shows it, and Settings › Privacy says so.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok($$ select public.set_shows_reader_level(true) $$,
  'allowed: the reader turns on Show it on my profile');
select is((public.my_privacy_settings() ->> 'shows_reader_level')::boolean, true,
  'Settings › Privacy shows the switch on');

-- 19 to 21: shown to members and visitors, never across a block.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.profile_reader_level('blocker') ->> 'level', 'new_reader',
  'allowed: another member sees a level the reader shows');
select pg_temp.sign_out();
select is(public.profile_reader_level('blocker') ->> 'level', 'new_reader',
  'allowed: a visitor sees it on a profile open to everyone');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(public.profile_reader_level('blocker'), null,
  'denied: a person the reader blocked sees nothing');

-- 22: turned off again, it is hidden again.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.set_shows_reader_level(false);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.profile_reader_level('blocker'), null,
  'switched back to Hidden, the level disappears for others');

select pg_temp.as_postgres();
select * from finish();
rollback;
