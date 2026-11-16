-- Database tests for one story in several languages: the rules and the writer's actions
-- (bundle TRANSLATE-1, part 1a; Robert, 16 Nov 2026).
-- What it proves:
-- - a writer adds a language to their own story (allowed) and nobody else can, not through
--   add_story_language() and not by writing the row (denied): only the writer translates;
-- - a language can't be added twice, an edition can't have editions and the limit holds;
-- - an edition always carries the first edition's shared settings (rating, who can read, tags),
--   whatever is written to it, and follows when they change;
-- - a later edition has no chapters of its own: each one translates a chapter of the story, is
--   started once, and is published only after the chapter it translates;
-- - the writer's lists (story_languages, story_translation_chapters, chapter_translation_source)
--   answer the writer and nobody else;
-- - deleting a story takes its editions with it and undo brings them back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The English edition of adult_writer's "Stația meteo", once it exists.
create function pg_temp.edition_id() returns uuid language sql as $$
  select id from public.stories
  where edition_of_story_id = '00000000-0000-4000-9000-000000000001' and language_code = 'en';
$$;
create function pg_temp.edition_slug() returns text language sql as $$
  select slug from public.stories where id = pg_temp.edition_id();
$$;
grant execute on function pg_temp.edition_id(), pg_temp.edition_slug() to authenticated, anon;

-- Two chapters on the story: one published, one a draft with text.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-a000-000000000a01', '00000000-0000-4000-9000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'edtsta01', 1, 'Unu', 'Text unu.', 2,
   'published', 'Unu', 'Text unu.', 2, now() - interval '3 days'),
  ('00000000-0000-4000-a000-000000000a02', '00000000-0000-4000-9000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'edtstb02', 2, 'Doi', 'Text doi.', 2,
   'draft', null, null, null, null);
select public.set_story_tags('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
  array[(select name from public.tags where status = 'approved' order by name limit 1)]);

-- 1. Only the writer adds a language.
select pg_temp.sign_out();
select throws_ok($$ select public.add_story_language('statia-meteo-seed01', 'en', 'The Weather Station', 'A grandmother notes the weather.') $$,
  '42501', null, 'a signed-out visitor can''t add a language');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.add_story_language('statia-meteo-seed01', 'en', 'The Weather Station', 'A grandmother notes the weather.') ->> 'outcome',
  'not_found', 'another member can''t add a language to someone else''s story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.add_story_language('statia-meteo-seed01', 'en', 'The Weather Station', 'A grandmother notes the weather.') ->> 'outcome',
  'ok', 'the writer adds English to their own story');
select isnt(pg_temp.edition_id(), null, 'the edition is a story of its own, linked to the first edition');
select is(public.add_story_language('statia-meteo-seed01', 'en', 'Again', 'Again and again.') ->> 'outcome',
  'language_taken', 'the same language can''t be added twice');
select is(public.add_story_language('statia-meteo-seed01', 'ro', 'Iar', 'Încă o dată aici.') ->> 'outcome',
  'language_taken', 'nor the language the story is already in');
select is(public.add_story_language(pg_temp.edition_slug(), 'ro', 'Iar', 'Încă o dată aici.') ->> 'outcome',
  'language_taken', 'asked on an edition, the language is added to its story, so Romanian is taken there too');

-- 2. The rows themselves refuse what the function never does.
reset role;
select throws_ok($$ insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating, ai_disclosure, edition_of_story_id)
    select '00000000-0000-4000-8000-000000000007', 'someone-elses-edition', 'Stolen', 'A translation by someone else.', 'sv',
      category_id, rating, ai_disclosure, id from public.stories where id = '00000000-0000-4000-9000-000000000001' $$,
  '23514', null, 'an edition owned by anyone but the writer is refused (Robert, 16 Nov 2026)');
select throws_ok($$ insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating, ai_disclosure, edition_of_story_id)
    select user_id, 'an-edition-of-an-edition', 'Chain', 'An edition of an edition.', 'sv',
      category_id, rating, ai_disclosure, id from public.stories where id = pg_temp.edition_id() $$,
  '23514', null, 'an edition can''t have editions of its own');
select throws_ok($$ update public.stories set edition_of_story_id = null where id = pg_temp.edition_id() $$,
  '23514', null, 'an edition stays an edition');
select throws_ok($$ update public.stories set language_code = 'en' where id = '00000000-0000-4000-9000-000000000001' $$,
  '23514', null, 'the first edition can''t move to a language one of its editions has');

-- 3. Shared settings: copied, kept and followed.
select is((select count(*)::integer from public.story_tags where story_id = pg_temp.edition_id()), 1,
  'the edition took the story''s tags');
update public.stories set rating = '16_plus', visibility = 'private' where id = pg_temp.edition_id();
select is((select rating::text || '/' || visibility::text from public.stories where id = pg_temp.edition_id()),
  'all_ages/public', 'an edition can''t be given a rating or visibility of its own');
update public.stories set rating = '13_plus', comments_enabled = false where id = '00000000-0000-4000-9000-000000000001';
select is((select rating::text || '/' || comments_enabled::text from public.stories where id = pg_temp.edition_id()),
  '13_plus/false', 'a change to the first edition''s rating and comments reaches the edition');
update public.stories set visibility = 'private' where id = '00000000-0000-4000-9000-000000000001';
select is((select visibility::text from public.stories where id = pg_temp.edition_id()), 'private',
  'a story made private is private in every language');
update public.stories set visibility = 'public', rating = 'all_ages', comments_enabled = true
  where id = '00000000-0000-4000-9000-000000000001';
select public.set_story_tags('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', array[]::text[]);
select is((select count(*)::integer from public.story_tags where story_id = pg_temp.edition_id()), 0,
  'a tag taken off the story is taken off the edition');

-- 4. Chapters of an edition are translations.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.create_chapter(pg_temp.edition_slug()) ->> 'outcome', 'is_translation',
  'an edition has no chapters of its own');
select is(public.start_chapter_translation(pg_temp.edition_slug(), 'edtsta01') ->> 'outcome', 'ok',
  'the writer starts the translation of chapter one');
select is(public.start_chapter_translation(pg_temp.edition_slug(), 'edtsta01') ->> 'code',
  (select code from public.chapters where story_id = pg_temp.edition_id() and translation_of_chapter_id = '00000000-0000-4000-a000-000000000a01'),
  'starting it again finds the same chapter');
select is((select count(*)::integer from public.chapters where story_id = pg_temp.edition_id()), 1, 'so there is one translation, not two');
select is(public.start_chapter_translation('statia-meteo-seed01', 'edtsta01') ->> 'outcome', 'not_found',
  'the first edition itself has nothing to translate into');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.start_chapter_translation(pg_temp.edition_slug(), 'edtsta01') ->> 'outcome', 'not_found',
  'another member can''t start a translation');
reset role;
select throws_ok($$ insert into public.chapters (story_id, user_id, code, position)
    values (pg_temp.edition_id(), '00000000-0000-4000-8000-000000000001', 'edtown01', 9) $$,
  '23514', null, 'a chapter of an edition must translate a chapter');
select throws_ok($$ insert into public.chapters (story_id, user_id, code, position, translation_of_chapter_id)
    values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'edtown02', 9, '00000000-0000-4000-a000-000000000a01') $$,
  '23514', null, 'a chapter of the first edition can''t be a translation');
select throws_ok($$ update public.chapters set translation_of_chapter_id = '00000000-0000-4000-a000-000000000a02'
    where story_id = pg_temp.edition_id() $$,
  '23514', null, 'a translation stays the translation of the same chapter');

-- 5. Publishing: the original first.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.start_chapter_translation(pg_temp.edition_slug(), 'edtstb02') ->> 'outcome', 'ok', 'chapter two''s translation is started');
reset role;
update public.chapters set draft_title = 'Translated', draft_body = 'Translated text.', word_count = 2
  where story_id = pg_temp.edition_id();
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.publish_chapter((select code from public.chapters where translation_of_chapter_id = '00000000-0000-4000-a000-000000000a02')) ->> 'outcome',
  'original_not_published', 'a translation can''t be published before the chapter it translates');
select is(public.schedule_chapter((select code from public.chapters where translation_of_chapter_id = '00000000-0000-4000-a000-000000000a02'), now() + interval '1 day') ->> 'outcome',
  'original_not_published', 'nor scheduled');
select is(public.publish_chapter((select code from public.chapters where translation_of_chapter_id = '00000000-0000-4000-a000-000000000a01')) ->> 'outcome',
  'ok', 'the translation of a published chapter is published');

-- 6. The writer's lists.
select is(jsonb_array_length(public.story_languages('statia-meteo-seed01') -> 'editions'), 2, 'the Languages table lists both editions');
select is(public.story_languages(pg_temp.edition_slug()) -> 'editions' -> 1 ->> 'chapters_published', '1',
  'the English edition has one of the chapters published');
select is(public.story_languages(pg_temp.edition_slug()) -> 'editions' -> 1 ->> 'chapters_in_draft', '1', 'and one in draft');
select is(jsonb_array_length(public.story_translation_chapters(pg_temp.edition_slug())), 2,
  'the edition''s chapter list has every chapter of the story');
select is(public.chapter_translation_source((select code from public.chapters where translation_of_chapter_id = '00000000-0000-4000-a000-000000000a01')) -> 'original' ->> 'body',
  'Text unu.', 'the editor gets the original beside the translation');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.story_languages('statia-meteo-seed01'), null, 'another member gets no Languages table');
select is(public.story_translation_chapters(pg_temp.edition_slug()), null, 'nor the edition''s chapter list');
select is(public.chapter_translation_source((select code from public.chapters where translation_of_chapter_id = '00000000-0000-4000-a000-000000000a01')), null,
  'nor the original beside someone else''s translation');

-- 7. The limit.
reset role;
update public.languages set status = 'open' where code = 'sv';
update public.settings set value = '2'::jsonb where key = 'story_languages_max';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.add_story_language('statia-meteo-seed01', 'sv', 'Väderstationen', 'En mormor antecknar vädret.') ->> 'outcome',
  'too_many', 'a story at its limit takes no more languages');

-- 8. Deleting and undoing.
select is(public.delete_my_story('statia-meteo-seed01') ->> 'outcome', 'ok', 'the writer deletes the story');
reset role;
select ok((select deleted_at is not null from public.stories where id = pg_temp.edition_id()), 'its editions go with it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.restore_my_story(pg_temp.edition_slug()) ->> 'outcome', 'story_deleted',
  'an edition can''t come back while its story is deleted');
select public.restore_my_story('statia-meteo-seed01');
reset role;
select is((select count(*)::integer from public.stories
    where id in ('00000000-0000-4000-9000-000000000001', pg_temp.edition_id()) and deleted_at is null), 2,
  'undo brings the story and its editions back');

select * from finish();

rollback;
