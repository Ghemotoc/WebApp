-- Database tests for the guides an empty Write page lists (board D04, user story 5.4; migration
-- books_d04_first_story_guides; CLAUDE.md rule 4).
-- What it proves:
-- - the three "first-story-" help pages are live for a signed-out visitor and a writer, in
--   English and Romanian, in the board's order (website_content() lists by address);
-- - each has the one line the Write page shows (its search description) and a section;
-- - each passes the checks a page published from Staff › Website passes, and the Romanian pages
--   use ș and ț with a comma below, never a cedilla.
-- Personas: adult_writer (…01). Test data: none; reads only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

select is(
  (select count(*) from public.cms_versions
   where content_kind = 'help_page' and entry_key like 'first-story-%' and status = 'published'
     and market_code is null),
  6::bigint, 'the three first-story guides are published in English and Romanian, for every country');

select is(
  (select count(*) from public.cms_versions
   where content_kind = 'help_page' and entry_key like 'first-story-%'
     and (coalesce(content #>> '{search,description}', '') = '' or coalesce(content ->> 'section', '') = '')),
  0::bigint, 'every guide has the one line the Write page shows, and a section for its kind');

select is(
  (select count(*) from public.cms_versions as versions
   where versions.content_kind = 'help_page' and versions.entry_key like 'first-story-%'
     and cardinality(public.cms_content_problems(versions)) > 0),
  0::bigint, 'every guide passes the checks a page published from Staff › Website passes');

select is(
  (select count(*) from public.cms_versions
   where content_kind = 'help_page' and entry_key like 'first-story-%' and language_code = 'ro'
     and content::text ~ '[şţŞŢ]'),
  0::bigint, 'the Romanian guides use ș and ț with a comma below, never a cedilla');

-- A signed-out visitor reads them in the board's order.
set local role anon;
select is(
  (select array_agg(live.entry_key order by ordinality)
   from public.website_content('help_page', 'RO', 'en') with ordinality as live
   where live.entry_key like 'first-story-%'),
  array['first-story-1-first-chapter', 'first-story-2-show-then-tell',
        'first-story-3-keeping-it-yours'],
  'a visitor reads the guides in the board''s order');
reset role;

-- A writer reading in Romanian gets the Romanian pages.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  (select count(*) from public.website_content('help_page', 'RO', 'ro') as live
   where live.entry_key like 'first-story-%' and live.language_code = 'ro'),
  3::bigint, 'a writer reading in Romanian gets the three Romanian guides');
reset role;

select * from finish();
rollback;
