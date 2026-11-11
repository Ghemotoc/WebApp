-- Database test: search and share fields for the website's home page and help pages (story
-- S1-E11-37, SEO-1b). Covers: a page with no search fields, or with fields inside the limits,
-- publishes as before; a search title over 70 characters, a description over 200, a switch that
-- isn't true or false, or search fields that aren't an object stop publishing with a named field;
-- nobody calls the check straight from the app.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- The seeded live home page and one seeded help page, each with its content changed in the test.
create function pg_temp.home_problems(search jsonb) returns text[] language sql as $$
  select public.cms_content_problems(jsonb_populate_record(versions,
    jsonb_build_object('content', versions.content || jsonb_build_object('search', search))))
  from public.cms_versions as versions
  where versions.content_kind = 'home_page' and versions.status = 'published'
  order by versions.created_at limit 1;
$$;
create function pg_temp.help_problems(search jsonb) returns text[] language sql as $$
  select public.cms_content_problems(jsonb_populate_record(versions,
    jsonb_build_object('content', versions.content || jsonb_build_object('search', search))))
  from public.cms_versions as versions
  where versions.content_kind = 'help_page' and versions.status = 'published'
  order by versions.created_at limit 1;
$$;

select is(
  (select public.cms_content_problems(versions) from public.cms_versions as versions
   where versions.content_kind = 'home_page' and versions.status = 'published'
   order by versions.created_at limit 1),
  '{}'::text[], 'a home page saved before the search fields still publishes');
select is(
  pg_temp.home_problems('{"title": "Stories, poems and essays", "description": "Write here.", "hidden": true}'),
  '{}'::text[], 'search fields inside the limits publish');
select ok(
  'search.title:too_long' = any (pg_temp.home_problems(jsonb_build_object('title', repeat('a', 71)))),
  'a search title over 70 characters is named');
select ok(
  'search.description:too_long' = any (pg_temp.help_problems(jsonb_build_object('description', repeat('a', 201)))),
  'a help page''s search description over 200 characters is named');
select ok(
  'search.hidden:invalid' = any (pg_temp.help_problems('{"hidden": "yes"}')),
  'a hide switch that isn''t true or false is named');
select ok(
  'search:invalid' = any (pg_temp.home_problems('"a text"')),
  'search fields that aren''t an object are refused');
select is(
  pg_temp.help_problems(jsonb_build_object('title', repeat('a', 70), 'description', repeat('a', 200))),
  '{}'::text[], 'exactly 70 and 200 characters are allowed');

-- Only cms_content_problems() calls the check; the app never does.
select ok(
  not has_function_privilege('anon', 'public.cms_search_problems(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.cms_search_problems(jsonb)', 'execute'),
  'visitors and members can''t call the search field check straight');

select * from finish();
rollback;
