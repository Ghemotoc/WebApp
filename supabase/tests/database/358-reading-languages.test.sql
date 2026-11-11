-- Database tests for the languages a member reads (bundle MARKETS-2, part c; IDEA-20261109-2).
-- What it proves:
-- - a member saves the languages they read; repeats and blanks are dropped, the order is kept;
--   an empty pick goes back to the default (null);
-- - a code that isn't a story language, more than ten, or a signed-out visitor is refused;
-- - only the member reads their own pick (profiles_select_own);
-- - the lists' language filter takes several codes ("sv,en"), and one code works as before.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- How many stories the "Recently updated" list holds for a language filter.
create function pg_temp.listed(language_filter text) returns integer language sql as $$
  select (public.browse_stories('updated', language => language_filter) ->> 'total')::integer;
$$;

/* ---------- 1. Saving the pick ---------- */

set local role authenticated;
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000001');

select is(public.set_my_reading_languages(array['sv', 'en', ' sv ', '']), array['sv', 'en'],
  'repeats and blanks are dropped and the order is kept');
select is((select reading_languages from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  array['sv', 'en'], 'the pick is saved on the member''s own profile');
select is(public.set_my_reading_languages('{}'), null::text[], 'an empty pick goes back to the default');
select is((select reading_languages from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  null::text[], 'and the profile says "not picked"');
select throws_ok($$ select public.set_my_reading_languages(array['xx']) $$, '23514',
  'That isn''t a story language.', 'a code that isn''t a story language is refused');
select throws_ok($$ select public.set_my_reading_languages(array['ro','en','sv','da','nb','fr','de','es','it','pt','nl']) $$,
  '23514', 'Pick up to ten languages.', 'more than ten is refused');

-- Someone else's pick stays private: profiles_select_own shows no other row.
select public.set_my_reading_languages(array['sv']);
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  0, 'another member can''t read someone''s reading languages');

reset role;
set local role anon;
select throws_ok($$ select public.set_my_reading_languages(array['en']) $$, '42501', null,
  'a signed-out visitor can''t save a pick (their choice is never stored)');

/* ---------- 2. The lists take several languages ---------- */

reset role;
-- The three seed stories get a published chapter each (as in 151): seed01 in Romanian, seed02 in
-- English, and seed03 made Swedish here; all three All ages, so an adult sees each.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rlng0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'rlng0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'rlng0003', 1, 'Ett', 'x', 1, 'published', 'Ett', 'Text.', 1, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now(), rating = 'all_ages'
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');
update public.stories set language_code = 'sv' where id = '00000000-0000-4000-9000-000000000003';

set local role authenticated;
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000001');
select is(pg_temp.listed('sv'), 1, 'one language finds its stories, as before');
select is(pg_temp.listed('sv,en'), 2, 'two languages find the stories in either');
select is(pg_temp.listed(null), 3, 'and no filter finds every language');
select is(pg_temp.listed('xx'), 0, 'a language nobody writes in finds nothing');

reset role;
select * from finish();
rollback;
