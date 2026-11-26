-- Database tests for reading one story in several languages (bundle TRANSLATE-1, part 1a;
-- Robert, 16 Nov 2026; design handoff "Design: translations handoff").
-- What it proves:
-- - a story opens in the page's language, then in a language the reader reads, then in its
--   first edition, and lists show it once, in that edition;
-- - the "Read in" switch and the language tags exist only for a story with more than one
--   language (Robert, 16 Nov 2026, 12:23 UTC);
-- - a reader keeps their chapter when changing language; a chapter the edition doesn't have yet
--   answers "not translated" with the original to read instead;
-- - a translation can be read only while its original can, and an edition never shows what the
--   first edition hides (rating, private);
-- - likes add up across languages to one total per story (Robert, 16 Nov 2026, 12:20 UTC).
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The page's language, as the app sends it with every request.
create function pg_temp.page_in(language text) returns void language sql as $$
  select set_config('request.headers', json_build_object('accept-language', language)::text, true);
$$;

-- The addresses under which a list shows "Stația meteo", through the public browse_stories().
create function pg_temp.listed_as(list_kind text, list_key text, language text) returns text language sql as $$
  select string_agg(card ->> 'slug', ',')
  from jsonb_array_elements(public.browse_stories(list_kind, list_key, null, null, language, null, 60) -> 'stories') as card
  where card ->> 'slug' in ('statia-meteo-seed01', 'the-weather-station-ed01');
$$;

-- The language tags on one story's card in the "new" list.
create function pg_temp.card_languages(story_slug text) returns jsonb language sql as $$
  select card -> 'languages'
  from jsonb_array_elements(public.browse_stories('new', null, null, null, null, null, 60) -> 'stories') as card
  where card ->> 'slug' = story_slug;
$$;

-- "Stația meteo" (Romanian, by adult_writer) with chapters A, B and C published, and an English
-- edition that has A and C translated and published, and B only as a draft.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-a000-000000000b01', '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   'rostaa01', 1, 'Unu', 'Text unu.', 2, 'published', 'Unu', 'Text unu.', 2, now() - interval '3 days'),
  ('00000000-0000-4000-a000-000000000b02', '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   'rostab02', 2, 'Doi', 'Text doi.', 2, 'published', 'Doi', 'Text doi.', 2, now() - interval '2 days'),
  ('00000000-0000-4000-a000-000000000b03', '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   'rostac03', 3, 'Trei', 'Text trei.', 2, 'published', 'Trei', 'Text trei.', 2, now() - interval '1 day');
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, ai_disclosure, edition_of_story_id)
select '00000000-0000-4000-9000-0000000000e1', user_id, 'the-weather-station-ed01', 'The Weather Station',
  'A grandmother notes the weather.', 'en', category_id, rating, ai_disclosure, id
from public.stories where id = '00000000-0000-4000-9000-000000000001';
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, translation_of_chapter_id)
values
  ('00000000-0000-4000-a000-000000000c01', '00000000-0000-4000-9000-0000000000e1', '00000000-0000-4000-8000-000000000001',
   'enstaa01', 1, 'One', 'Text one.', 2, 'published', 'One', 'Text one.', 2, now() - interval '3 days',
   '00000000-0000-4000-a000-000000000b01'),
  ('00000000-0000-4000-a000-000000000c02', '00000000-0000-4000-9000-0000000000e1', '00000000-0000-4000-8000-000000000001',
   'enstab02', 2, 'Two', 'Text two.', 2, 'draft', null, null, null, null,
   '00000000-0000-4000-a000-000000000b02'),
  ('00000000-0000-4000-a000-000000000c03', '00000000-0000-4000-9000-0000000000e1', '00000000-0000-4000-8000-000000000001',
   'enstac03', 3, 'Three', 'Text three.', 2, 'published', 'Three', 'Text three.', 2, now() - interval '1 day',
   '00000000-0000-4000-a000-000000000b03');
-- A second story of the same writer, in one language, with a chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
   'radioa01', 1, 'One', 'Radio text.', 2, 'published', 'One', 'Radio text.', 2, now() - interval '3 days');

-- 1. Which edition opens (the teacher persona reads Romanian by default).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select pg_temp.page_in('en');
select is(public.story_opening_edition('statia-meteo-seed01') ->> 'slug', 'the-weather-station-ed01',
  'on an English page the story opens in English');
select pg_temp.page_in('ro');
select is(public.story_opening_edition('the-weather-station-ed01') ->> 'slug', 'statia-meteo-seed01',
  'on a Romanian page it opens in Romanian, whichever address was asked');
select pg_temp.page_in('sv-SE,sv;q=0.9');
select is(public.story_opening_edition('the-weather-station-ed01') ->> 'slug', 'statia-meteo-seed01',
  'on a page in a language the story lacks, it opens in a language the reader reads');
reset role;
update public.profiles set reading_languages = array['en', 'ro'] where id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.story_opening_edition('statia-meteo-seed01') ->> 'slug', 'the-weather-station-ed01',
  'the reader''s own reading languages decide, in their order');
select is(public.story_opening_edition('the-girl-who-fixed-radios-seed02'), null,
  'a story in one language has nothing to choose');
reset role;
update public.profiles set reading_languages = null where id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');

-- 2. Lists show the story once.
select pg_temp.page_in('en');
select is(pg_temp.listed_as('new', null, null),
  'the-weather-station-ed01', 'on an English page a list holds the story once, as its English edition');
select pg_temp.page_in('ro');
select is(pg_temp.listed_as('new', null, null),
  'statia-meteo-seed01', 'on a Romanian page, once, as its Romanian edition');
select is(pg_temp.listed_as('new', null, 'en'),
  'the-weather-station-ed01', 'a language filter shows the edition in that language');
select is(pg_temp.listed_as('search', 'weather station', null),
  'statia-meteo-seed01', 'a search for the English title finds the story, shown in the reader''s edition');

-- 3. The switch and the tags: only with more than one language.
select is(jsonb_array_length(public.get_story_page('statia-meteo-seed01') -> 'editions'), 2,
  'the story page of a story in two languages has a Read in switch with both');
select is(public.get_story_page('the-girl-who-fixed-radios-seed02') -> 'editions', '[]'::jsonb,
  'a story in one language has no switch');
select is(jsonb_array_length(pg_temp.card_languages('statia-meteo-seed01')), 2,
  'a card of a story in two languages carries both language tags');
select is(pg_temp.card_languages('the-girl-who-fixed-radios-seed02'), '[]'::jsonb,
  'a card of a story in one language carries none');
select is(public.get_chapter('the-girl-who-fixed-radios-seed02', 'radioa01') -> 'editions', '[]'::jsonb,
  'nor does its reader page');
select is(public.get_story_page('the-weather-station-ed01') -> 'edition' ->> 'is_original', 'false',
  'the English edition is not the original');
select is(public.get_story_page('the-weather-station-ed01') -> 'edition' ->> 'original_language', 'ro',
  'and names the language the story was written in');

-- 4. The edition's chapters follow the story's.
select is(jsonb_array_length(public.get_story_page('the-weather-station-ed01') -> 'chapters'), 3,
  'the English story page lists every chapter of the story');
select is(public.get_story_page('the-weather-station-ed01') -> 'chapters' -> 1 ->> 'is_translated', 'false',
  'chapter two is marked as not translated yet');
select is(public.get_story_page('the-weather-station-ed01') -> 'chapters' -> 1 ->> 'code', 'rostab02',
  'and carries the original''s address');
select is(public.get_chapter('the-weather-station-ed01', 'enstac03') ->> 'number', '3',
  'the translated third chapter is chapter 3 of the story, not 2 of the translated ones');
select is(public.get_chapter('the-weather-station-ed01', 'enstac03') ->> 'previous_code', 'rostab02',
  'the arrow back leads to chapter two, which this edition doesn''t have yet');
select is((select entry ->> 'chapter_code' from jsonb_array_elements(public.get_chapter('the-weather-station-ed01', 'enstac03') -> 'editions') as entry
    where entry ->> 'language_code' = 'ro'), 'rostac03', 'Read in Romanian keeps the reader on chapter three');
select is((select entry ->> 'chapter_code' from jsonb_array_elements(public.get_chapter('statia-meteo-seed01', 'rostaa01') -> 'editions') as entry
    where entry ->> 'language_code' = 'en'), 'enstaa01', 'and Read in English from chapter one leads to its translation');
select is(public.get_chapter('the-weather-station-ed01', 'rostaa01') ->> 'code', 'enstaa01',
  'the original''s code under the English address answers with the translation');

-- 5. A chapter the edition doesn't have yet.
select is(public.get_chapter('the-weather-station-ed01', 'rostab02') ->> 'missing_translation', 'true',
  'chapter two under the English address answers "not translated yet"');
select is(public.get_chapter('the-weather-station-ed01', 'rostab02') -> 'original' ->> 'slug', 'statia-meteo-seed01',
  'with the original to read instead');
select is(public.get_chapter('the-weather-station-ed01', 'rostab02') ->> 'previous_code', 'enstaa01',
  'and the nearest earlier chapter the edition has');
select ok(public.get_chapter('the-weather-station-ed01', 'rostab02') ->> 'body' is null, 'and no text');
select is(public.get_chapter('the-weather-station-ed01', 'rostab02') ->> 'translated_through', '1',
  'it says the translation reaches chapter one without a gap');
select is(public.get_chapter('the-weather-station-ed01', 'enstab02'), null, 'the draft translation itself can''t be read');
select is(public.get_chapter('statia-meteo-seed01', 'enstaa01'), null, 'a translation''s code under the first edition''s address answers null');

-- 6. Likes: one total per story. A story's Likes sit on the first edition (bundle 2, board B01),
-- so both editions show the same count; chapter likes stay on their chapters.
reset role;
insert into public.story_likes (user_id, story_id) values
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9000-000000000001');
select is(public.story_like_total('00000000-0000-4000-9000-000000000001'), 3, 'likes in both languages add up on the first edition');
select is(public.story_like_total('00000000-0000-4000-9000-0000000000e1'), 3, 'and the edition shows the same total');

-- 6b. Who hears about a translated chapter: followers of the story, in any language, and not
-- the writer's followers again (teen_17 follows the Romanian edition, kid_14_ok the writer).
insert into public.follows_stories (user_id, story_id) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000001')
  on conflict do nothing;
delete from public.follows_users where followed_user_id = '00000000-0000-4000-8000-000000000001';
delete from public.notifications where kind = 'new_chapter';
insert into public.follows_users (user_id, followed_user_id) values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001');
select public.notify_chapter_published(jsonb_build_object(
  'story_id', '00000000-0000-4000-9000-0000000000e1', 'chapter_id', '00000000-0000-4000-a000-000000000c03'));
select is((select count(*)::integer from public.notifications where kind = 'new_chapter'
    and chapter_id = '00000000-0000-4000-a000-000000000c03' and user_id = '00000000-0000-4000-8000-000000000002'), 1,
  'someone who follows the story in Romanian hears that a chapter came out in English');
select is((select count(*)::integer from public.notifications where kind = 'new_chapter'
    and chapter_id = '00000000-0000-4000-a000-000000000c03' and user_id = '00000000-0000-4000-8000-000000000003'), 0,
  'the writer''s followers aren''t told again for a translation');
select public.notify_chapter_published(jsonb_build_object(
  'story_id', '00000000-0000-4000-9000-000000000001', 'chapter_id', '00000000-0000-4000-a000-000000000b03'));
select is((select count(*)::integer from public.notifications where kind = 'new_chapter'
    and chapter_id = '00000000-0000-4000-a000-000000000b03' and user_id = '00000000-0000-4000-8000-000000000003'), 1,
  'they are told about the original chapter, as before');

-- 6c. A restriction on the story keeps its other languages out of lists too (S1-E11-08).
insert into public.story_restrictions (story_id, user_id, restricted_by_user_id, reason)
select '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000009', 'Test restriction.';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select pg_temp.page_in('en');
select is(pg_temp.listed_as('new', null, null), null, 'a restricted story is in no list in any language');
reset role;
delete from public.story_restrictions where story_id = '00000000-0000-4000-9000-000000000001';

-- 7. A translation is readable only while its original is.
update public.chapters set status = 'draft', unpublished_at = now() where id = '00000000-0000-4000-a000-000000000b01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('the-weather-station-ed01', 'enstaa01'), null,
  'unpublishing a chapter closes its translation');
reset role;
update public.chapters set status = 'published', unpublished_at = null where id = '00000000-0000-4000-a000-000000000b01';

-- 8. An edition never shows what the first edition hides.
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(public.get_story_page('the-weather-station-ed01'), null, 'kid_14_ok can''t open the English edition of a 16+ story');
reset role;
update public.stories set rating = 'all_ages', visibility = 'private' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_story_page('the-weather-station-ed01'), null, 'a private story is private in English too');
select pg_temp.sign_out();
select is(public.get_chapter('the-weather-station-ed01', 'enstaa01'), null, 'and for a signed-out visitor');

select * from finish();

rollback;
