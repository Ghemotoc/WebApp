-- Database tests for classics open to visitors and search engines (GROWTH-2; Robert, GROWTH
-- thread, 26 Nov 2026, 15:11 and 15:13 UTC).
-- What it proves, as a signed-out visitor:
-- - get_chapter() sends a public-domain classic's chapter whole, not the teaser, and asks no
--   sign-in for it;
-- - a writer's own chapter still sends only the teaser and asks to sign in;
-- - the sitemap lists a classic's chapter and leaves out a writer's chapter (GROWTH-4; Robert,
--   26 Nov 2026, 19:45 UTC: only the story's page) and a 16+ story's chapter, from which visitors
--   get no text.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Counts the words in a text (word_total() is closed to visitors).
create function pg_temp.words_in(any_text text) returns integer language sql as $$
  select coalesce(array_length(regexp_split_to_array(btrim(any_text), '\s+'), 1), 0);
$$;

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- A chapter of 120 words in each of adult_writer's two All ages stories; seed01 becomes a classic
-- by Ion Creangă, seed02 stays the writer's own.
insert into public.classic_authors (id, name, died_year)
values ('00000000-0000-4000-9400-000000000001', 'Ion Creangă', 1889);
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'grow0001', 1,
   'Unu', 'x', 120, 'published', 'Unu', repeat('cuvânt ', 120), 120, now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'grow0002', 1,
   'One', 'x', 120, 'published', 'One', repeat('word ', 120), 120, now() - interval '1 day');
update public.stories set classic_author_id = '00000000-0000-4000-9400-000000000001',
  first_published_at = now() - interval '2 days', last_chapter_published_at = now() - interval '2 days'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '1 day',
  last_chapter_published_at = now() - interval '1 day'
where id = '00000000-0000-4000-9000-000000000002';

select pg_temp.sign_out();

/* ---------- 1. A classic is read whole ---------- */

select is(pg_temp.words_in(public.get_chapter('statia-meteo-seed01', 'grow0001') ->> 'body'), 120,
  'a visitor reads a classic''s chapter whole');
select is(public.get_chapter('statia-meteo-seed01', 'grow0001') ->> 'is_teaser', 'false',
  'and it is not the teaser');
select is(public.get_chapter('statia-meteo-seed01', 'grow0001') ->> 'needs_sign_in', 'false',
  'and no sign-in is asked for');

/* ---------- 2. A writer's chapter keeps the teaser ---------- */

select ok(pg_temp.words_in(public.get_chapter('the-girl-who-fixed-radios-seed02', 'grow0002') ->> 'body') < 120,
  'a visitor reads only the teaser of a writer''s chapter');
select is(public.get_chapter('the-girl-who-fixed-radios-seed02', 'grow0002') ->> 'needs_sign_in', 'true',
  'and is asked to sign in for the rest');

/* ---------- 3. The sitemap ---------- */

select ok(exists (select 1 from public.sitemap_entries() where path = '/s/statia-meteo-seed01/grow0001'),
  'the sitemap lists a classic''s chapter');
select ok(not exists (select 1 from public.sitemap_entries() where path = '/s/the-girl-who-fixed-radios-seed02/grow0002'),
  'but not a writer''s chapter: only the story''s page is listed (GROWTH-4)');
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_out();
select ok(not exists (select 1 from public.sitemap_entries() where path = '/s/statia-meteo-seed01/grow0001'),
  'nor a 16+ chapter, from which visitors get no text');

select * from finish();
rollback;
