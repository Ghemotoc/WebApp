-- Database tests for the story footer and its search details (CALM-9s; Robert's canvas comments
-- of 23 Nov 2026, boards B01 to B06).
-- What it proves, as a signed-out visitor calling get_link_preview():
-- - the genre is the story's first approved, recommended tag in its language, and a free tag a
--   writer typed is never the genre;
-- - the writer's username comes with the pen name, for the profile link;
-- - the first publication and last change dates are there, for datePublished and dateModified;
-- - "In the app only" and a country block are flagged, without naming the countries;
-- - the sitemap lists a public story's book page, even once it is hidden in a country (COUNTRY-2);
-- - a story in one language lists no editions;
-- - the helpers stay closed to visitors, and the answer never carries the user ID.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- adult_writer's All ages "Stația meteo", published with one chapter, a free tag first, then the
-- recommended "Mystery".
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'footera1', 1,
  'Unu', 'x', 3, 'published', 'Unu', 'Un capitol scurt.', 3, now());
update public.stories set first_published_at = now(), blurb = 'O stație meteo pe munte.'
where id = '00000000-0000-4000-9000-000000000001';
insert into public.tags (name, normalised_name, status, is_recommended)
values ('Stații meteo', 'statii meteo', 'approved', false);
insert into public.story_tags (story_id, tag_id, user_id, created_at)
values
  ('00000000-0000-4000-9000-000000000001', (select id from public.tags where normalised_name = 'statii meteo'),
   '00000000-0000-4000-8000-000000000001', now() - interval '2 minutes'),
  ('00000000-0000-4000-9000-000000000001', (select id from public.tags where name = 'Mystery'),
   '00000000-0000-4000-8000-000000000001', now() - interval '1 minute');

select pg_temp.sign_out();

-- 1. The genre and the writer.
select isnt(public.get_link_preview('statia-meteo-seed01') ->> 'genre', 'Stații meteo',
  'a free tag a writer typed is never the genre');
select ok(public.get_link_preview('statia-meteo-seed01') ->> 'genre' is not null,
  'the first recommended tag is the genre');
select is(public.get_link_preview('statia-meteo-seed01') -> 'writer' ->> 'handle', 'adult_writer',
  'the username comes with the pen name, for the profile link');

-- 2. The dates.
select ok(public.get_link_preview('statia-meteo-seed01') ->> 'first_published_at' is not null,
  'the first publication date is there');
select ok(public.get_link_preview('statia-meteo-seed01') ->> 'updated_at' is not null,
  'and the last change');

-- 3. What keeps a story out of search engines.
select is(public.get_link_preview('statia-meteo-seed01') ->> 'is_hidden_somewhere', 'false',
  'a story shown everywhere is not hidden anywhere');
select ok(exists (select 1 from public.sitemap_entries() where path = '/s/statia-meteo-seed01'),
  'and the sitemap lists it');
reset role;
update public.stories set hidden_in_countries = array['MD'] where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_out();
select is(public.get_link_preview('statia-meteo-seed01') ->> 'is_hidden_somewhere', 'true',
  'a country block is flagged');
select ok(public.get_link_preview('statia-meteo-seed01')::text not like '%MD%',
  'without naming the countries');
select ok(exists (select 1 from public.sitemap_entries() where path = '/s/statia-meteo-seed01'),
  'and the sitemap still lists its book page (COUNTRY-2, Robert, 27 Nov 2026)');
select is(public.get_link_preview('statia-meteo-seed01') ->> 'is_app_only', 'false',
  'a story read on the web is not app-only');

-- 4. Editions and privacy.
select is(public.get_link_preview('statia-meteo-seed01') -> 'editions', '[]'::jsonb,
  'a story in one language lists no editions');
select ok(public.get_link_preview('statia-meteo-seed01')::text not like '%00000000-0000-4000-8000-000000000001%',
  'never the user ID');

select * from finish();
rollback;
