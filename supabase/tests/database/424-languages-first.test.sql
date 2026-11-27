-- Database tests for browse_stories()'s languages_first (CLASSICS-ORDER; Robert's decision card
-- "Reader's languages first", 27 Nov 2026, 20:33 UTC).
-- What it proves:
-- - with languages_first, stories in those languages come first and every other language
--   follows, each part in the list's own order; nothing is left out and the total stays the same;
-- - without it the list keeps its own order;
-- - a code that isn't a language code is refused.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- The slugs of a list, in order.
create function pg_temp.slugs(answer jsonb) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by position), '')
  from jsonb_array_elements(answer -> 'stories') with ordinality as listed(story, position);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Two seed stories get a published chapter each: seed01 (ro) updated two hours ago, seed02 (en,
-- made All ages here) one hour ago, so the newest-update order is seed02, then seed01.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'lfst0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'lfst0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now());
update public.stories set first_published_at = now() - interval '3 hours', last_chapter_published_at = now() - interval '2 hours'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '3 hours', last_chapter_published_at = now() - interval '1 hour',
  rating = 'all_ages'
where id = '00000000-0000-4000-9000-000000000002';

select set_config('role', 'anon', true);

select is(pg_temp.slugs(public.browse_stories('updated', sort_order => 'updated')),
  'the-girl-who-fixed-radios-seed02,statia-meteo-seed01',
  'without languages_first the list keeps its own order: the newest update first');

select is(pg_temp.slugs(public.browse_stories('updated', sort_order => 'updated', languages_first => 'ro')),
  'statia-meteo-seed01,the-girl-who-fixed-radios-seed02',
  'with languages_first ro, the Romanian story comes first and the English one still follows');

select is((public.browse_stories('updated', languages_first => 'ro') ->> 'total')::integer,
  (public.browse_stories('updated') ->> 'total')::integer,
  'nothing is left out: the total stays the same');

select is(pg_temp.slugs(public.browse_stories('updated', sort_order => 'updated', languages_first => 'en, ro')),
  pg_temp.slugs(public.browse_stories('updated', sort_order => 'updated')),
  'with every listed language first, each keeps the list''s own order');

select throws_ok($$ select public.browse_stories('updated', languages_first => 'Romanian') $$,
  '22023', 'Unknown language.', 'a code that isn''t a language code is refused');

select * from finish();
rollback;
