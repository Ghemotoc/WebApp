-- Database test: the sitemap's addresses and the verification settings (story S1-E11-38, SEO-1c).
-- Covers: the sitemap lists the home page, Discover, the help centre, live help pages and public
-- stories; it never lists an unlisted, private, class-only, deleted or moderated-away story, or a
-- help page staff hid from search engines; anyone may read it; the two verification settings
-- exist, start empty and are public, so the home page can show them; a landing page's search
-- fields are checked in each language.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- adult_writer's "Stația meteo" (seeded, never published) goes live for the test.
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';
create function pg_temp.listed(wanted_path text) returns boolean language sql as $$
  select exists (select 1 from public.sitemap_entries() as entries where entries.path = wanted_path);
$$;
create function pg_temp.story_path() returns text language sql as $$
  select '/s/' || slug from public.stories where id = '00000000-0000-4000-9000-000000000001';
$$;

-- LOCALISE-1: website pages are listed at /<country>/<language>/..., for each open market.
select ok(pg_temp.listed('/ro/ro') and pg_temp.listed('/ro/en') and pg_temp.listed('/discover')
    and pg_temp.listed('/ro/ro/help') and pg_temp.listed('/ro/en/help'),
  'the home page, Discover and the help centre are listed');
select ok(pg_temp.listed('/ro/ro/help/getting-started') and pg_temp.listed('/ro/en/help/getting-started'),
  'a live help page is listed');
select ok(pg_temp.listed(pg_temp.story_path()), 'a public story is listed, with its page address');

-- Who a story is for decides whether it is listed.
update public.stories set visibility = 'unlisted' where id = '00000000-0000-4000-9000-000000000001';
select ok(not pg_temp.listed(pg_temp.story_path()), 'an unlisted story is not listed');
update public.stories set visibility = 'private' where id = '00000000-0000-4000-9000-000000000001';
select ok(not pg_temp.listed(pg_temp.story_path()), 'a private story is not listed');
update public.stories set visibility = 'public', class_only = true where id = '00000000-0000-4000-9000-000000000001';
select ok(not pg_temp.listed(pg_temp.story_path()), 'a class-only story is not listed');
update public.stories set class_only = false, deleted_at = now() where id = '00000000-0000-4000-9000-000000000001';
select ok(not pg_temp.listed(pg_temp.story_path()), 'a deleted story is not listed');
update public.stories set deleted_at = null where id = '00000000-0000-4000-9000-000000000001';

-- A help page staff hid from search engines, in every language, is not listed (S1-E11-37).
update public.cms_versions
set content = content || '{"search": {"title": "", "description": "", "hidden": true}}'::jsonb
where content_kind = 'help_page' and entry_key = 'getting-started';
select ok(not pg_temp.listed('/ro/en/help/getting-started') and not pg_temp.listed('/ro/ro/help/getting-started'), 'a help page hidden from search engines is not listed');

-- A landing page's search fields are checked in each language (S1-E11-38).
select is(public.landing_search_problems(
    '{"hidden": true, "ro": {"title": "Concurs", "description": ""}, "en": {"title": "", "description": ""}}'),
  '{}'::text[], 'a landing page''s search fields inside the limits pass');
select is(public.landing_search_problems(jsonb_build_object(
    'hidden', 'yes', 'en', jsonb_build_object('description', repeat('a', 201)))),
  array['search.hidden:invalid', 'search.en.description:too_long'],
  'a landing page''s wrong switch and long English description are named');
select ok(not has_function_privilege('anon', 'public.landing_search_problems(jsonb)', 'execute'),
  'only the publish check calls it');

-- Anyone may read the sitemap, as search engines do.
select ok(has_function_privilege('anon', 'public.sitemap_entries()', 'execute'),
  'visitors may read the sitemap');

-- The verification codes: present, empty and public.
select is((select count(*) from public.settings
           where key in ('search_verification_google', 'search_verification_bing')
             and value = '""'::jsonb and is_public),
  2::bigint, 'the two verification settings start empty and are public');
set local role anon;
select is((select count(*) from public.settings
           where key in ('search_verification_google', 'search_verification_bing')),
  2::bigint, 'visitors may read them, so the home page can show them');
reset role;

select * from finish();
rollback;
