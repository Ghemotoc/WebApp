-- Break test for one story in several languages (bundle TRANSLATE-1, part 1a; Robert's rule:
-- every bundle gets a break test before it is merged).
-- What it tries, and what must hold:
-- - a member reaching for the internal helpers or writing the rows directly is refused;
-- - a writer can't give a translation a lower rating through the story settings;
-- - an odd Accept-Language header never breaks a page or picks an edition by accident;
-- - what moderators take away, a block or a deleted chapter closes in every language;
-- - removing one language leaves the story, the language can be added again, and purging the
--   story takes every edition and translation with it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.page_in(language text) returns void language sql as $$
  select set_config('request.headers', json_build_object('accept-language', language)::text, true);
$$;

-- "Stația meteo" with one published chapter, and an English edition with its translation.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-a000-000000000d01', '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   'mirosa01', 1, 'Unu', 'Text unu.', 2, 'published', 'Unu', 'Text unu.', 2, now() - interval '3 days');
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, ai_disclosure, edition_of_story_id)
select '00000000-0000-4000-9000-0000000000e2', user_id, 'the-weather-station-ed02', 'The Weather Station',
  'A grandmother notes the weather.', 'en', category_id, rating, ai_disclosure, id
from public.stories where id = '00000000-0000-4000-9000-000000000001';
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, translation_of_chapter_id)
values ('00000000-0000-4000-a000-000000000d02', '00000000-0000-4000-9000-0000000000e2', '00000000-0000-4000-8000-000000000001',
   'miensa01', 1, 'One', 'Text one.', 2, 'published', 'One', 'Text one.', 2, now() - interval '3 days',
   '00000000-0000-4000-a000-000000000d01');

-- 1. Internal helpers and direct writes are closed to members.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.best_edition_id('00000000-0000-4000-9000-000000000001', null) $$, '42501', null,
  'a member can''t call best_edition_id()');
select throws_ok($$ select public.story_family_ids('00000000-0000-4000-9000-000000000001') $$, '42501', null,
  'nor story_family_ids()');
select throws_ok($$ select public.edition_page_chapters('00000000-0000-4000-9000-0000000000e2', '00000000-0000-4000-9000-000000000001') $$, '42501', null,
  'nor edition_page_chapters()');
select throws_ok($$ select public.page_language() $$, '42501', null, 'nor page_language()');
select throws_ok($$ update public.stories set edition_of_story_id = '00000000-0000-4000-9000-000000000003'
    where id = '00000000-0000-4000-9000-000000000001' $$, '42501', null,
  'a member can''t write the edition link on a story row');
select throws_ok($$ update public.chapters set translation_of_chapter_id = null
    where id = '00000000-0000-4000-a000-000000000d02' $$, '42501', null,
  'nor the translation link on a chapter row');

-- 2. The writer can't rate a translation lower than the story.
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.update_my_story('the-weather-station-ed02', '{"rating": "all_ages"}'::jsonb) $$,
  'asking for a lower rating on the English edition doesn''t fail');
reset role;
select is((select rating::text from public.stories where id = '00000000-0000-4000-9000-0000000000e2'), '16_plus',
  'but the edition keeps the story''s rating (CLAUDE.md rule 18)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.get_chapter('the-weather-station-ed02', 'miensa01'), null, 'so kid_14_ok still can''t read it in English');
reset role;
update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000001';

-- 3. Odd Accept-Language headers.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select pg_temp.page_in('en''; drop table public.stories; --');
select is(public.story_opening_edition('statia-meteo-seed01') ->> 'slug', 'statia-meteo-seed01',
  'a header with SQL in it is not a language: the reader''s own languages decide');
select pg_temp.page_in(repeat('x', 5000));
select is(public.story_opening_edition('statia-meteo-seed01') ->> 'slug', 'statia-meteo-seed01',
  'a header of nonsense falls back to a language the reader reads');
select set_config('request.headers', 'not json at all', true);
select throws_ok($$ select public.story_opening_edition('statia-meteo-seed01') $$, '22P02', null,
  'a request whose headers aren''t JSON fails loudly (PostgREST never sends one)');
select pg_temp.page_in('en');

-- 4. What is closed in one language is closed in every language.
reset role;
insert into public.blocks (user_id, blocked_user_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_story_page('the-weather-station-ed02'), null, 'a blocked reader can''t open the edition');
reset role;
delete from public.blocks where user_id = '00000000-0000-4000-8000-000000000001';
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'story', '00000000-0000-4000-9000-000000000001', 'removed',
  '00000000-0000-4000-8000-000000000009', 'Break test.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('the-weather-station-ed02', 'miensa01'), null,
  'a story moderators removed can''t be read in its other languages');
select is(public.get_story_page('the-weather-station-ed02'), null, 'and its other story pages are closed');
reset role;
delete from public.moderated_items where item_id = '00000000-0000-4000-9000-000000000001';
update public.chapters set deleted_at = now() where id = '00000000-0000-4000-a000-000000000d01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('the-weather-station-ed02', 'miensa01'), null,
  'a deleted chapter''s translation can''t be read');
reset role;
update public.chapters set deleted_at = null where id = '00000000-0000-4000-a000-000000000d01';

-- 5. Removing a language, adding it again, and the purge.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.delete_my_story('the-weather-station-ed02') ->> 'outcome', 'ok', 'the writer removes the English edition');
reset role;
select ok((select deleted_at is null from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'the story itself stays');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.add_story_language('statia-meteo-seed01', 'en', 'The Weather Station', 'A grandmother notes the weather.') ->> 'outcome',
  'ok', 'English can be added again after it was removed');
reset role;
delete from public.stories where id = '00000000-0000-4000-9000-000000000001';
select is((select count(*)::integer from public.stories where edition_of_story_id = '00000000-0000-4000-9000-000000000001')
  + (select count(*)::integer from public.chapters where id = '00000000-0000-4000-a000-000000000d02'), 0,
  'purging the story takes every edition and translated chapter with it');

select * from finish();

rollback;
