-- Database tests for genres (story S1-E3-01; Robert, 26 Nov 2026: "all the genres ... like in
-- bookshops").
-- What it proves:
-- - the list holds the mainstream bookshop genres, each with an English and a Romanian name;
-- - genres_select_public: anyone reads the all-ages genres, an adult reads the 18+ ones, and an
--   under-18 or a visitor never sees an 18+ genre (rule 18, age_band());
-- - set_my_story_genres(): only the writer sets them, at most three, cleaned and in order; an
--   unknown genre is refused; an under-18 can't name an 18+ genre; an 18+ genre needs an 18+
--   story; lowering the rating takes the 18+ genre off (the trigger);
-- - story_list_genres() lists only genres on stories the reader may see, so an 18+ story's
--   genres never reach a teenager, and browse_stories(genre_slug) filters by one genre.
-- Personas: adult_writer (…01, writer of seed01 and seed02), teen_17 (…02, 16 to 17, writer of
-- seed03), teacher (…07, another adult member).
-- Test data: a published chapter on seed01 and seed02; every change is rolled back.
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
grant execute on all functions in schema pg_temp to authenticated, anon;

-- One published chapter on each of adult_writer's seed stories, so the lists hold them.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'genr0001', 1,
   'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'genr0002', 1,
   'One', 'x', 1, 'published', 'One', 'Text.', 1, now());

/* ---------- 1. The list ---------- */

select ok((select count(*) from public.genres) between 80 and 200,
  'the list holds the mainstream genres (80 to 200 of them)');
select is_empty($$ select slug from public.genres where name_ro !~ '\S' or name_en !~ '\S' or name_ro ~ '[şţŞŢ]' $$,
  'every genre has an English and a Romanian name, the Romanian one with ș and ț (comma below)');
select is(array(select slug from public.genres where minimum_rating = '18_plus' order by slug),
  array['erotic_poetry', 'erotic_romance', 'erotica'], 'the erotic genres are 18+ only');

/* ---------- 2. Who reads which genres (genres_select_public) ---------- */

select pg_temp.sign_out();
select ok(exists (select 1 from public.genres where slug = 'epic_fantasy'),
  'allowed: genres_select_public — a visitor reads the all-ages genres');
select ok(not exists (select 1 from public.genres where slug = 'erotica'),
  'denied: genres_select_public — a visitor never sees an 18+ genre');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(not exists (select 1 from public.genres where minimum_rating = '18_plus'),
  'denied: genres_select_public — a 17-year-old never sees an 18+ genre');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(exists (select 1 from public.genres where slug = 'erotica'),
  'allowed: genres_select_public — an adult reads the 18+ genres');

/* ---------- 3. Saving a story's genres ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_my_story_genres('statia-meteo-seed01', array['fantasy']) ->> 'outcome',
  'not_found', 'another member can''t set the genres of someone else''s story');
select pg_temp.sign_out();
select throws_ok($$ select public.set_my_story_genres('statia-meteo-seed01', array['fantasy']) $$,
  '42501', null, 'a visitor can''t set genres');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.set_my_story_genres('scrisori-din-cutia-postala-seed03', array['erotic_poetry']) $$,
  '23514', null, 'a 17-year-old writer can''t name an 18+ genre (it isn''t on their list)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.set_my_story_genres('statia-meteo-seed01', array['not_a_genre']) $$,
  '23514', null, 'a genre that isn''t on the list is refused');
select throws_ok(
  $$ select public.set_my_story_genres('statia-meteo-seed01', array['fantasy', 'horror', 'romance', 'satire']) $$,
  '23514', null, 'a fourth genre is refused');
select throws_ok($$ select public.set_my_story_genres('statia-meteo-seed01', array['erotica']) $$,
  '23514', null, 'an 18+ genre is refused on a story that isn''t rated 18+');
select is(public.set_my_story_genres('statia-meteo-seed01', array[' Cosy_Mystery', 'family_saga', 'cosy_mystery']) ->> 'outcome',
  'ok', 'the writer picks two genres');
select is((select genre_slugs from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  array['cosy_mystery', 'family_saga'], 'they are saved in lower case, once each, in the order picked');

/* ---------- 4. An 18+ genre stays on 18+ stories only ---------- */

reset role;
update public.stories set rating = '18_plus', rating_reasons = '{sexual_content}'
where id = '00000000-0000-4000-9000-000000000002';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_story_genres('the-girl-who-fixed-radios-seed02', array['erotic_romance', 'romance']) ->> 'outcome',
  'ok', 'an 18+ story may carry an 18+ genre');
select is(array(select slug from public.story_list_genres() order by slug),
  array['cosy_mystery', 'erotic_romance', 'family_saga', 'romance'],
  'an adult''s genre filter lists every genre in use, the 18+ one included');
select is(public.browse_stories('updated', genre_slug => 'cosy_mystery') -> 'stories' -> 0 ->> 'slug',
  'statia-meteo-seed01', 'browse_stories() filters by one genre');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(array(select slug from public.story_list_genres() order by slug),
  array['cosy_mystery', 'family_saga'],
  'a 17-year-old''s genre filter lists only the genres of stories they may see, never the 18+ one');
select is((public.browse_stories('updated', genre_slug => 'erotic_romance') ->> 'total')::integer, 0,
  'and filtering by the 18+ genre finds nothing for them');
select pg_temp.sign_out();
select ok(not exists (select 1 from public.story_list_genres() where slug = 'erotic_romance'),
  'a visitor''s genre filter has no 18+ genre either');
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
select is((select genre_slugs from public.stories where id = '00000000-0000-4000-9000-000000000002'),
  array['romance'], 'lowering the rating to 16+ takes the 18+ genre off and keeps the rest');

select * from finish();
rollback;
