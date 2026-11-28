-- Database tests for a country-hidden story's book page in search engines (COUNTRY-2; Robert,
-- 27 Nov 2026, decision card 22:06 UTC and messages 22:17 to 22:21 UTC).
-- What it proves, for a classic hidden in the United States (as Orwell is):
-- - the sitemap lists its book page, and the story still counts as searchable;
-- - the sitemap lists none of its chapters, while the same classic shown everywhere has them;
-- - a visitor (or a crawler) connecting from the United States gets no chapter text and is told
--   only the country stands in the way, while a visitor from Romania reads the chapter whole;
-- - the same holds for a writer's own story: book page listed, chapters never.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- A country token as server/signup-context.ts makes it (the same as 393-hide-in-countries).
create function pg_temp.token(country text) returns text language sql as $$
  select 'v1.' || country || '.' || extract(epoch from now())::bigint::text || '.'
    || encode(extensions.hmac('v1.' || country || '.' || extract(epoch from now())::bigint::text,
         'test-signup-secret', 'sha256'), 'hex');
$$;
-- The header the app sends on every request (src/lib/viewerCountry.ts), or none.
create function pg_temp.connect_from(country text) returns void language sql as $$
  select set_config('request.headers',
    case when country is null then '{}' else json_build_object('x-viewer-country', pg_temp.token(country))::text end, true);
$$;
create function pg_temp.listed(address text) returns boolean language sql as $$
  select exists (select 1 from public.sitemap_entries() where path = address);
$$;
-- story_is_searchable() is internal, so the test asks it as the database owner.
create function pg_temp.searchable() returns boolean language sql security definer as $$
  select public.story_is_searchable('00000000-0000-4000-9000-000000000001');
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-signup-secret', 'signup_context_secret')
  where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
select vault.update_secret(id, 'test-signup-secret') from vault.secrets where name = 'signup_context_secret';

-- adult_writer's seed01 becomes a classic by Ion Creangă with one All ages chapter, hidden in the
-- United States; seed02 stays the writer's own, with one chapter, hidden in Moldova.
insert into public.classic_authors (id, name, died_year)
values ('00000000-0000-4000-9400-000000000001', 'Ion Creangă', 1889);
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ctry0001', 1,
   'Unu', 'x', 120, 'published', 'Unu', repeat('cuvânt ', 120), 120, now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'ctry0002', 1,
   'One', 'x', 120, 'published', 'One', repeat('word ', 120), 120, now() - interval '1 day');
update public.stories set classic_author_id = '00000000-0000-4000-9400-000000000001',
  first_published_at = now() - interval '2 days', last_chapter_published_at = now() - interval '2 days'
where id = '00000000-0000-4000-9000-000000000001';
update public.stories set first_published_at = now() - interval '1 day',
  last_chapter_published_at = now() - interval '1 day', hidden_in_countries = array['MD']
where id = '00000000-0000-4000-9000-000000000002';

/* ---------- 1. Shown everywhere, the classic's chapter is listed ---------- */

select pg_temp.sign_out();
select ok(pg_temp.listed('/s/statia-meteo-seed01/ctry0001'),
  'a classic shown everywhere has its chapter in the sitemap');

/* ---------- 2. Hidden in the United States ---------- */

reset role;
update public.stories set hidden_in_countries = array['US'] where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_out();
select ok(pg_temp.listed('/s/statia-meteo-seed01'),
  'a classic hidden in the United States keeps its book page in the sitemap');
select ok(not pg_temp.listed('/s/statia-meteo-seed01/ctry0001'),
  'but none of its chapters');
select ok(pg_temp.searchable(), 'and the story still counts as searchable for profiles and categories');

/* ---------- 3. What a visitor or crawler in each country gets ---------- */

select pg_temp.connect_from('US');
select is(public.get_chapter('statia-meteo-seed01', 'ctry0001'), null,
  'a visitor connecting from the United States gets no chapter text');
select is(public.story_unavailable_here('statia-meteo-seed01'), true,
  'and is told only the country stands in the way');
select pg_temp.connect_from('RO');
select is(public.get_chapter('statia-meteo-seed01', 'ctry0001') ->> 'is_teaser', 'false',
  'a visitor connecting from Romania reads the chapter whole');
select is(public.story_unavailable_here('statia-meteo-seed01'), false,
  'and is told nothing about countries');

/* ---------- 4. A writer's story hidden in a country ---------- */

select pg_temp.connect_from(null);
select ok(pg_temp.listed('/s/the-girl-who-fixed-radios-seed02'),
  'a writer''s story hidden in Moldova keeps its book page in the sitemap');
select ok(not pg_temp.listed('/s/the-girl-who-fixed-radios-seed02/ctry0002'),
  'and its chapters stay out, as every writer''s chapters do');

select * from finish();
rollback;
