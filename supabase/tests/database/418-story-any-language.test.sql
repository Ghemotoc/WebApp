-- Database tests for stories in any language of the world (story S1-E3-01; Robert, 26 Nov 2026:
-- "the writer can pick the language from an all language list", and readers' filters list "only
-- the languages currently written in").
-- What it proves:
-- - world_language_codes() holds the 182 ISO 639-1 codes; is_story_language_code() accepts them
--   and the languages table's own codes, and refuses a code that is no language;
-- - a writer creates a story in Japanese (allowed) but not in "xx" (denied), moves a story to
--   Hungarian, and adds a Korean edition, which still can't repeat a language the story has;
-- - a reader may tick Japanese among their reading languages (allowed) but not "xx" (denied);
-- - story_languages_written_in() lists a language only once a story in it can be read, by
--   everyone who may see it, and drops it again when moderators hide the story or the reader
--   can't see the story's rating; an edition counts only once a chapter of it can be read;
-- - visitors and members may call story_languages_written_in(), nobody calls the internal lists.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.labels(rating text) returns jsonb language sql as $$
  select jsonb_build_object('rating', rating, 'ai_disclosure', 'no_ai');
$$;
-- Whether the caller's language filter lists this language.
create function pg_temp.listed(code text) returns boolean language sql as $$
  select code in (select public.story_languages_written_in());
$$;
grant execute on function pg_temp.listed(text) to anon, authenticated;

-- 1. The list of the world's languages.
select is(cardinality(public.world_language_codes()), 182, 'the world list holds the 182 ISO 639-1 codes');
select ok(public.is_story_language_code('ja'), 'Japanese is a story language');
select ok(public.is_story_language_code('ro'), 'Romanian still is');
select ok(not public.is_story_language_code('xx'), 'a code that is no language is not');
select ok(not public.is_story_language_code(null), 'and neither is no code');

-- 2. A writer picks any language.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.create_story('Haiku de iarnă', 'Poeme scurte.', 'ja', 'poetry', '{}', '{"kind": "automatic"}',
  null, pg_temp.labels('all_ages'))) ->> 'outcome', 'ok', 'allowed: a writer creates a story in Japanese');
select throws_ok($$ select public.create_story('Nicăieri', '', 'xx', 'fiction', '{}', '{"kind": "automatic"}', null, pg_temp.labels('all_ages')) $$,
  '23514', null, 'denied: a code that is no language is refused');
select is((public.update_my_story('statia-meteo-seed01', '{"language_code": "hu"}')) ->> 'outcome', 'ok',
  'a writer moves a story to Hungarian, a language nobody opened');
select is((select language_code from public.stories where slug = 'statia-meteo-seed01'), 'hu',
  'and the story is in Hungarian');
select is(public.add_story_language('statia-meteo-seed01', 'ko', 'Stația meteo', 'O bunică notează vremea.') ->> 'outcome',
  'ok', 'a writer adds a Korean edition');
select is(public.add_story_language('statia-meteo-seed01', 'hu', 'Again', 'Again and again.') ->> 'outcome',
  'language_taken', 'an edition still can''t repeat the story''s own language');

-- 3. A reader ticks any story language.
select is(public.set_my_reading_languages(array['ja', 'ro']), array['ja', 'ro'],
  'allowed: a reader reads Japanese and Romanian');
select throws_ok($$ select public.set_my_reading_languages(array['xx']) $$, '23514', null,
  'denied: a code that is no language is refused');

-- 4. The readers' filters list only the languages written in.
select pg_temp.sign_out();
select ok(not pg_temp.listed('ja'), 'a Japanese story with no chapter out adds no language');
reset role;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select id, user_id, 'jahaiku1', 1, 'Unu', 'Zăpadă.', 1, 'published', 'Unu', 'Zăpadă.', 1, now() - interval '1 day'
from public.stories where title = 'Haiku de iarnă';
select pg_temp.sign_out();
select ok(pg_temp.listed('ja'), 'once a chapter is out, visitors see Japanese in the filter');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(pg_temp.listed('ja'), 'and so do members');
select ok(not pg_temp.listed('ko'), 'an edition with no translated chapter out adds no language');

-- A rating the reader is too young for hides the language from them too (CLAUDE.md rule 18).
reset role;
update public.stories set rating = '18_plus' where title = 'Haiku de iarnă';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select ok(not pg_temp.listed('ja'), 'a 14-year-old doesn''t see the language of an 18+ story');
reset role;
update public.stories set rating = 'all_ages' where title = 'Haiku de iarnă';

-- A story moderators hid adds no language.
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select user_id, 'story', id, 'hidden', '00000000-0000-4000-8000-000000000009', 'Test hide.'
from public.stories where title = 'Haiku de iarnă';
select pg_temp.sign_out();
select ok(not pg_temp.listed('ja'), 'a story moderators hid adds no language');

-- 5. Who may call what.
reset role;
select ok(has_function_privilege('anon', 'public.story_languages_written_in()', 'execute'),
  'visitors may ask which languages stories are written in');
select ok(not has_function_privilege('authenticated', 'public.world_language_codes()', 'execute'),
  'nobody calls the internal world list from outside');
select ok(not has_function_privilege('anon', 'public.is_story_language_code(text)', 'execute'),
  'nor the internal language test');

select * from finish();
rollback;
