-- Database tests for "Popular in" a country (bundle MARKETS-2, part d; Robert, 8 Nov 2026).
-- What it proves:
-- - a read counts on the day's total for the reader's profile country, never who read;
-- - each story gets a score per country from that country's reads, likes and comments;
-- - a story with fewer than 5 reads in a country isn't ranked there (the small-number rule);
-- - a country with fewer than 5 ranked stories shows the overall ranking (popular_in is null);
-- - a popular list follows a country's ranking once it has enough stories;
-- - a country not on the drop-down's list is refused, and only staff read the totals and scores.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- The slugs of the popular list, in order, for a country.
create function pg_temp.popular_slugs(country text) returns text language sql as $$
  select string_agg(card ->> 'slug', ',' order by position)
  from jsonb_array_elements(public.browse_stories('popular', popular_in => country) -> 'stories')
    with ordinality as cards(card, position);
$$;

/* ---------- Set-up: three readable stories, read from Sweden and the UK ---------- */

-- The three seed stories get a published chapter each, All ages, so everyone sees them.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'popi0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'popi0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'popi0003', 1, 'Trei', 'x', 1, 'published', 'Trei', 'Text.', 1, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now(), rating = 'all_ages'
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
  '00000000-0000-4000-9000-000000000003');

-- Today's totals: seed01 read 10 times from Sweden, seed02 3 times from Sweden and 20 from the
-- UK, seed03 6 times from Sweden.
insert into public.chapter_reads_by_country (chapter_id, read_on, country_code, total)
select chapters.id, (now() at time zone 'Europe/Bucharest')::date, totals.country, totals.total
from (values ('popi0001', 'SE', 10), ('popi0002', 'SE', 3), ('popi0002', 'GB', 20),
             ('popi0003', 'SE', 6)) as totals(code, country, total)
join public.chapters on chapters.code = totals.code;
-- The overall ranking puts seed02 first (the UK reads), so a Swedish order is easy to tell apart.
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.id, (now() at time zone 'Europe/Bucharest')::date, totals.total
from (values ('popi0001', 10), ('popi0002', 23), ('popi0003', 6)) as totals(code, total)
join public.chapters on chapters.code = totals.code;

select public.compute_story_scores();
select public.compute_story_country_scores();

/* ---------- 1. Scores per country and the small-number rule ---------- */

select is((select count(*)::integer from public.story_country_scores where country_code = 'SE'), 2,
  'Sweden ranks the two stories read there at least 5 times');
select is((select count(*)::integer from public.story_country_scores
           where country_code = 'SE' and story_id = '00000000-0000-4000-9000-000000000002'), 0,
  'a story read fewer than 5 times in a country isn''t ranked there');
select ok((select score from public.story_country_scores
           where country_code = 'SE' and story_id = '00000000-0000-4000-9000-000000000001')
        > (select score from public.story_country_scores
           where country_code = 'SE' and story_id = '00000000-0000-4000-9000-000000000003'),
  'more reads in a country give a higher score there');
select is((select count(*)::integer from public.story_country_scores where country_code = 'GB'), 1,
  'the UK ranks only the story read there');

/* ---------- 2. The lists ---------- */

set local role anon;
select is(public.browse_stories('popular', popular_in => 'SE') -> 'popular_in', 'null'::jsonb,
  'a country with fewer than 5 ranked stories shows the overall ranking');
select is(pg_temp.popular_slugs('SE'),
  'the-girl-who-fixed-radios-seed02,statia-meteo-seed01,scrisori-din-cutia-postala-seed03',
  'and the list is in the overall order');

reset role;
update public.settings set value = '2'::jsonb where key = 'popular_in_minimum_stories';
set local role anon;
select is(public.browse_stories('popular', popular_in => 'SE') ->> 'popular_in', 'SE',
  'with enough ranked stories the list says it follows the country');
select is(pg_temp.popular_slugs('SE'),
  'statia-meteo-seed01,scrisori-din-cutia-postala-seed03,the-girl-who-fixed-radios-seed02',
  'the country''s ranking comes first, then a story not ranked there');
select is(public.browse_stories('updated', sort_order => 'title_az', popular_in => 'SE') -> 'popular_in',
  'null'::jsonb, 'another sort ignores the country');
select throws_ok($$ select public.browse_stories('popular', popular_in => 'ZZ') $$, '22023',
  'Unknown country.', 'a country not on the list is refused');
select throws_ok($$ select public.browse_stories('popular', popular_in => 'se') $$, '22023',
  'Unknown country.', 'a lower-case code is refused too');

/* ---------- 3. Recording a read, and who reads the totals ---------- */

reset role;
update public.profiles set country_code = 'SE' where id = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000001');
select public.record_chapter_read('scrisori-din-cutia-postala-seed03', 'popi0003');
reset role;
select is((select total from public.chapter_reads_by_country
           join public.chapters on chapters.id = chapter_reads_by_country.chapter_id
           where chapters.code = 'popi0003' and country_code = 'SE'), 7,
  'a read adds one to the total for the reader''s profile country');

set local role authenticated;
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.chapter_reads_by_country)
          + (select count(*)::integer from public.story_country_scores), 0,
  'a member reads no country totals or scores, not even for their own story');
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.story_country_scores $$, '42501', null,
  'a signed-out visitor can''t read the scores');

reset role;
select * from finish();
rollback;
