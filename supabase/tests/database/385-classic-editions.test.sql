-- Database tests for a classic in several languages (bundle TRANSLATE-1d; Robert, 16 Nov 2026;
-- board TrStaff).
-- What it proves:
-- - an admin adds an English edition of a Romanian classic: it belongs to the classics account,
--   takes the author, rating and category from the first edition, and its chapters are tied to
--   the original's in order;
-- - a language the classic already has, an edition of an edition, and more chapters than the
--   original are refused;
-- - a translation can't be published without its rights, nor "public domain" with a named
--   translator and no year of death, nor before its original; with the rights it goes live, and
--   the story page names the translator and the rights;
-- - a living translator under a licence does not block the public-domain check; a year of death
--   without a name is refused;
-- - a moderator and a member can't add an edition (denied), the admin can (allowed).
-- Test data: the seed persona "teacher" stands in for the classics account (the setting is
-- pointed at it inside this transaction, which is rolled back).
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;
-- The details staff type for an English edition of a classic.
create function pg_temp.english_edition(first_edition uuid, extra jsonb) returns jsonb language sql as $$
  select jsonb_build_object('edition_of_story_id', first_edition, 'language_code', 'en',
    'title', 'Memories of My Boyhood', 'blurb', 'A childhood in Humulești.') || extra;
$$;
grant execute on all functions in schema pg_temp to authenticated;

update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
create temporary table saved (original_id uuid, edition_id uuid, other_id uuid);
grant all on saved to authenticated;
insert into saved default values;

/* ---------- 1. The original, in Romanian, with two chapters ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
update saved set original_id = (public.admin_save_classic_work(jsonb_build_object(
  'title', 'Amintiri din copilărie', 'blurb', 'Copilăria la Humulești.',
  'author_id', public.admin_add_classic_author('Ion Creangă', 1889), 'kind', 'novel',
  'original_language', 'ro', 'language_code', 'ro', 'category_slug', 'fiction', 'rating', '13_plus',
  'source_title', 'Wikisource, ediția 1892', 'source_url', 'https://ro.wikisource.org/wiki/Amintiri'))
  ->> 'story_id')::uuid;
select public.admin_set_classic_chapters((select original_id from saved),
  '[{"title": "I", "body": "Stau câteodată și-mi aduc aminte."}, {"title": "II", "body": "Nică a lui Ștefan."}]'::jsonb);

/* ---------- 2. Who may add an edition ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.english_edition((select original_id from saved), '{}')) $$,
  '42501', null, 'denied: a moderator can''t add an edition of a classic');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.english_edition((select original_id from saved), '{}')) $$,
  '42501', null, 'denied: nor can a member');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
update saved set edition_id = (public.admin_save_classic_work(pg_temp.english_edition(
  (select original_id from saved), '{"translator_name": "Ana Vlad"}')) ->> 'story_id')::uuid;
select isnt((select edition_id from saved), null, 'allowed: an admin adds an English edition');
-- classic_work_json() is internal (staff reach it through the admin_* functions), so the test
-- reads it as the database owner.
select pg_temp.sign_out();
select is(public.classic_work_json((select edition_id from saved)) ->> 'edition_of_story_id',
  (select original_id::text from saved), 'the edition points at its first edition');
select is(public.classic_work_json((select edition_id from saved)) - 'story_id' - 'slug' - 'chapters'
    - 'updated_at' - 'was_published' - 'free_markets' - 'details_checked' - 'blurb' - 'title'
    - 'edition_of_story_id' - 'author',
  jsonb_build_object('language_code', 'en', 'rating', '13_plus', 'content_note', '',
    'category_slug', 'fiction', 'kind', 'novel', 'original_language', 'ro',
    'source_title', 'Wikisource, ediția 1892', 'source_url', 'https://ro.wikisource.org/wiki/Amintiri',
    'translator_name', 'Ana Vlad', 'translator_died_year', null, 'translation_rights', null,
    'first_published_year', null, 'hidden_in_countries', '[]'::jsonb),
  'it takes the rating, category, kind, original language and source from the first edition');
select is(public.classic_work_json((select edition_id from saved)) -> 'author' ->> 'name', 'Ion Creangă',
  'and the author');
select is((select profiles.handle from public.stories join public.profiles on profiles.id = stories.user_id
           where stories.id = (select edition_id from saved)), 'teacher',
  'the edition belongs to the classics account');

/* ---------- 3. What is refused ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.english_edition((select original_id from saved), '{}')) $$,
  '23514', 'This classic already has that language.', 'a second English edition is refused');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.english_edition((select original_id from saved), '{"language_code": "ro"}')) $$,
  '23514', 'This classic already has that language.', 'so is an edition in the original''s own language');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.english_edition((select edition_id from saved), '{"language_code": "sv"}')) $$,
  'P0002', 'That isn''t a classic.', 'an edition of an edition is refused');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.english_edition((select original_id from saved),
    '{"language_code": "sv", "translator_died_year": 1950}')) $$,
  '23514', null, 'a translator''s year of death without a name is refused');
select throws_ok($$ select public.admin_set_classic_chapters((select edition_id from saved),
    '[{"title": "I", "body": "One."}, {"title": "II", "body": "Two."}, {"title": "III", "body": "Three."}]'::jsonb) $$,
  '23514', 'An edition can''t have more chapters than its original.',
  'an edition can''t have more chapters than its original');

/* ---------- 4. The text and publishing ---------- */

select public.admin_set_classic_chapters((select edition_id from saved),
  '[{"title": "I", "body": "Sometimes I sit and remember."}, {"title": "II", "body": "Nică, son of Ștefan."}]'::jsonb);
select pg_temp.sign_out();
select is((select array_agg(originals.position order by translated.position)
           from public.chapters as translated
           join public.chapters as originals on originals.id = translated.translation_of_chapter_id
           where translated.story_id = (select edition_id from saved) and translated.deleted_at is null
             and originals.story_id = (select original_id from saved)),
  array[1, 2], 'each chapter of the edition is tied to the original''s chapter with the same number');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_publish_classic((select edition_id from saved)) $$,
  '23514', 'Choose the translation rights first.', 'a translation can''t be published without its rights');
select public.admin_save_classic_work(pg_temp.english_edition(null,
  '{"translator_name": "Ana Vlad", "translation_rights": "public_domain"}') - 'edition_of_story_id',
  (select edition_id from saved));
select throws_ok($$ select public.admin_publish_classic((select edition_id from saved)) $$,
  '23514', 'Add the year the translator died.',
  '"public domain" with a named translator needs the translator''s year of death');
select public.admin_save_classic_work(pg_temp.english_edition(null,
  '{"translator_name": "Ana Vlad", "translation_rights": "made_for_platform"}') - 'edition_of_story_id',
  (select edition_id from saved));
select pg_temp.sign_out();
select is(public.classic_work_json((select edition_id from saved)) -> 'free_markets' ->> 'RO', 'true',
  'a living translator whose translation was made for the platform does not block the check');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_publish_classic((select edition_id from saved)) $$,
  '23514', 'Publish the original first.', 'an edition waits for its original');
select public.admin_publish_classic((select original_id from saved));
select lives_ok($$ select public.admin_publish_classic((select edition_id from saved)) $$,
  'with its rights and its original live, the edition is published');

/* ---------- 5. What a reader sees ---------- */

select pg_temp.sign_out();
create temporary table slugs as
  select (select slug from public.stories where id = (select edition_id from saved)) as edition_slug,
         (select slug from public.stories where id = (select original_id from saved)) as original_slug;
grant select on slugs to authenticated;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.get_story_page((select edition_slug from slugs)) -> 'edition') - 'first_edition_slug',
  jsonb_build_object('original_language', 'ro', 'is_original', false, 'is_first_edition', false,
    'first_edition_language', 'ro', 'chapters_in_story', 2, 'chapters_here', 2,
    'translator_name', 'Ana Vlad', 'is_classic', true, 'translation_rights', 'made_for_platform'),
  'the story page names the translator and the rights of the edition');
select is(public.get_story_page((select original_slug from slugs)) -> 'edition' ->> 'is_classic', 'true',
  'the original says it is a classic, for "Rights: Public domain"');
select is(jsonb_array_length(public.get_story_page((select original_slug from slugs)) -> 'editions'), 2,
  'and lists both languages for "Read in"');

/* ---------- 6. A classic shown in translation from the start ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
update saved set other_id = (public.admin_save_classic_work(jsonb_build_object(
  'title', 'Crăiasa zăpezii', 'author_id', public.admin_add_classic_author('Hans Christian Andersen', 1875),
  'kind', 'short_story', 'original_language', 'da', 'language_code', 'ro', 'category_slug', 'fiction',
  'rating', 'all_ages', 'source_title', 'Ediția 1930', 'source_url', 'https://example.com/craiasa'))
  ->> 'story_id')::uuid;
select public.admin_set_classic_chapters((select other_id from saved), '[{"title": "I", "body": "A fost odată."}]'::jsonb);
select throws_ok($$ select public.admin_publish_classic((select other_id from saved)) $$,
  '23514', 'Choose the translation rights first.',
  'a first edition in another language than the work was written in is a translation too');

select * from finish();
rollback;
