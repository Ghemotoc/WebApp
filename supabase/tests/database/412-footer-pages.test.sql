-- Database test: the footer's "About the apps" and "For partners" pages (Robert, 25 Nov 2026,
-- 09:50 UTC: no widget missing between the canvas and the live site, and editable from the
-- back end).
-- Covers: both pages are live for a visitor at /c/apps and /c/partners, in both languages, with
-- no draft shown; they pass the same publish checks as any page, so staff can edit and publish
-- them in the page builder like any other.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- 1. A visitor reads both pages through the public read, live today.
set local role anon;
select is(public.landing_page('apps')->>'state', 'live', 'a visitor sees the About the apps page live');
select is(public.landing_page('partners')->>'state', 'live', 'a visitor sees the For partners page live');
select is(public.landing_page('apps')->'content'->'blocks'->0->'en'->>'title', 'The apps',
  'the apps page opens with its hero in English');
select is(public.landing_page('partners')->'content'->'blocks'->0->'ro'->>'title', 'Lucrează cu noi',
  'the partners page has its hero in Romanian too');
select is(public.landing_page('partners')->'content'->'blocks'->2->>'link', '/contact',
  'the partners page ends with a button to Contact us');

-- 2. The live versions pass the editor's publish checks, so staff can change and publish them.
reset role;
select is(
  (select count(*)::int
   from public.landing_pages as pages
   where pages.slug in ('apps', 'partners')
     and pages.page_type = 'information'
     and cardinality(public.landing_page_problems(pages.page_type,
       (public.landing_page_live_version(pages.id)).content)) = 0),
  2,
  'both pages are information pages whose live version passes the publish checks');

select * from finish();
rollback;
