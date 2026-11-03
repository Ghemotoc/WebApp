-- Database tests for links to landing pages from the CMS (story S1-E11-14 criterion 13; bundle
-- CONTESTS-13a2c).
-- What it proves: cms_link_problems() accepts /c/<name> for a landing page that exists, refuses
-- one that doesn't or is archived, and keeps refusing other unknown addresses.
-- Personas: admin (…09) makes the page. Test data: one landing page; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}', true);
create temporary table kept (id uuid) on commit drop;
insert into kept select public.admin_create_landing_page('toamna-link-test', 'campaign');
reset role;

select is(public.cms_link_problems('[Concursul](/c/toamna-link-test)', 'RO', 'link'), '{}'::text[],
  'a link to a landing page that exists is fine');
select is(public.cms_link_problems('[Concursul](/c/toamna-link-test/)', 'RO', 'link'), '{}'::text[],
  'with a final slash too');
select is(public.cms_link_problems('[Nimic](/c/no-such-page)', 'RO', 'link'),
  array['link:broken_link:/c/no-such-page'], 'a landing page that doesn''t exist is a broken link');

update public.landing_pages set archived_at = now() where id = (select id from kept);
select is(public.cms_link_problems('[Concursul](/c/toamna-link-test)', 'RO', 'link'),
  array['link:broken_link:/c/toamna-link-test'], 'an archived landing page is a broken link');
select is(public.cms_link_problems('[Altceva](/nowhere)', 'RO', 'link'),
  array['link:broken_link:/nowhere'], 'other unknown addresses are still refused');

select * from finish();
rollback;
