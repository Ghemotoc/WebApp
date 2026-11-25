-- Database tests for the Rating and Length filters of the story lists (user story 1.8, board
-- A08-SearchResults; CLAUDE.md rule 18).
-- What it proves:
-- - Rating keeps only the stories of the one rating picked, and the total counts only them;
-- - Length keeps stories under 10 readable chapters ("short") or with 10 or more ("long"), and the
--   two together with Rating narrow the list further;
-- - a rating above the reader's age is never let back in by the filter: a 14-year-old asking for
--   16+ gets an empty list;
-- - an unknown length is refused, and the filter helper isn't callable from the app.
-- Personas: kid_14_ok (…03), teacher (…07, an adult reader). Seed stories: seed01 "Stația meteo"
-- (All ages), seed02 (made 16+ here), seed03 (13+), and seed99 by `blocked` (All ages).
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The slugs of a list, in order.
create function pg_temp.slugs(answer jsonb) returns text language sql as $$
  select coalesce(string_agg(story ->> 'slug', ',' order by position), '')
  from jsonb_array_elements(answer -> 'stories') with ordinality as listed(story, position);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- seed01 gets 10 published chapters (a "long" story), seed02 and seed03 one each (short); seed02
-- becomes 16+. seed03 is the newest update, then seed02, then seed01.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
  'flt' || lpad(chapter_number::text, 5, '0'), chapter_number, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()
from generate_series(1, 10) as chapter_number;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'flt00020', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'flt00030', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
update public.stories set first_published_at = now() - interval '3 hours', last_chapter_published_at = now() - interval '3 hours'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '4 hours', last_chapter_published_at = now() - interval '2 hours',
  rating = '16_plus'
where id = '00000000-0000-4000-9000-000000000002';
update public.stories set first_published_at = now() - interval '1 hour', last_chapter_published_at = now() - interval '1 hour'
where id = '00000000-0000-4000-9000-000000000003';

/* ---------- 1. Rating (an adult reader, who may see every rating) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.slugs(public.browse_stories('updated', story_rating => '16_plus')),
  'the-girl-who-fixed-radios-seed02', 'Rating 16+ keeps only the 16+ story');
select is((public.browse_stories('updated', story_rating => '16_plus') ->> 'total')::integer, 1,
  'and the total counts only it');
select is(pg_temp.slugs(public.browse_stories('updated', story_rating => '13_plus')),
  'scrisori-din-cutia-postala-seed03', 'Rating 13+ keeps only the 13+ story');

/* ---------- 2. Length, alone and with Rating ---------- */

select is(pg_temp.slugs(public.browse_stories('updated', story_length => 'long')),
  'statia-meteo-seed01', '10 chapters or more keeps only the story with 10 chapters');
select ok(pg_temp.slugs(public.browse_stories('updated', story_length => 'short')) not like '%statia-meteo-seed01%',
  'under 10 chapters leaves it out');
select is((public.browse_stories('updated', story_length => 'short') ->> 'total')::integer
    + (public.browse_stories('updated', story_length => 'long') ->> 'total')::integer,
  (public.browse_stories('updated') ->> 'total')::integer,
  'short and long together make the whole list');
select is((public.browse_stories('updated', story_rating => '16_plus', story_length => 'long') ->> 'total')::integer, 0,
  'Rating and Length together narrow the list further');

/* ---------- 3. A rating above the reader's age stays out (rule 18) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((public.browse_stories('updated', story_rating => '16_plus') ->> 'total')::integer, 0,
  'a 14-year-old asking for 16+ gets an empty list');

/* ---------- 4. Refusals ---------- */

select pg_temp.sign_out();
select throws_ok($$ select public.browse_stories('updated', story_length => 'medium') $$, '22023', null,
  'an unknown length is refused');
select throws_ok($$ select public.story_matches_list_filters('00000000-0000-4000-9000-000000000001', 'all_ages', null, null) $$,
  '42501', null, 'the filter helper isn''t callable from the app');

select * from finish();
rollback;
