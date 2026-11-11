-- Database test: the staff "Search and sharing" read (story S1-E11-39, SEO-1d).
-- Covers: admin_search_pages() gives the owner and admins the live home pages, help pages and
-- landing pages with their addresses, never a draft or an archived landing page; staff without
-- the website area (a moderator, support) are refused with insufficient_privilege, and visitors
-- may not call it at all.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

-- Three landing pages: one live, one only a draft and one live but archived.
insert into public.landing_pages (id, slug, page_type, user_id) values
  ('00000000-0000-4000-a368-000000000001', 'search-live-test', 'campaign', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-a368-000000000002', 'search-draft-test', 'campaign', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-a368-000000000003', 'search-archived-test', 'campaign', '00000000-0000-4000-8000-000000000009');
insert into public.landing_page_versions (page_id, content, status, show_from, published_at, user_id) values
  ('00000000-0000-4000-a368-000000000001', '{"theme": "sage", "blocks": []}', 'published', public.romania_today(), now(), '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-a368-000000000002', '{"theme": "sage", "blocks": []}', 'draft', null, null, '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-a368-000000000003', '{"theme": "sage", "blocks": []}', 'published', public.romania_today(), now(), '00000000-0000-4000-8000-000000000009');
update public.landing_pages set archived_at = now() where id = '00000000-0000-4000-a368-000000000003';

-- 1. The admin (allowed) sees every kind of public page.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
create temporary table seen as select * from public.admin_search_pages();
select ok(exists (select 1 from seen where page_kind = 'home_page' and address = '/'),
  'an admin sees the home page at "/"');
select ok(exists (select 1 from seen where page_kind = 'help_page' and address = '/help/getting-started'),
  'an admin sees a live help page with its address');
select ok(exists (select 1 from seen where page_kind = 'landing_page' and address = '/c/search-live-test'
    and market_code is null and language_code = 'ro'),
  'an admin sees a live landing page, in Romanian, with no market');
select ok(not exists (select 1 from seen where address in ('/c/search-draft-test', '/c/search-archived-test')),
  'a landing page that is only a draft, or archived, is not listed');
select ok((select count(*) from seen where page_kind = 'home_page') = 2,
  'one home page for each live market and language');

-- 2. The owner (allowed) too.
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok((select count(*) from public.admin_search_pages()) > 0, 'the owner sees the pages');

-- 3. Staff without the website area (denied).
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok('select * from public.admin_search_pages()', '42501', null,
  'a moderator, who has no website area, is refused');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok('select * from public.admin_search_pages()', '42501', null,
  'a member who isn''t staff (kid_14_ok) is refused');

-- 4. Visitors may not call it.
reset role;
select ok(not has_function_privilege('anon', 'public.admin_search_pages()', 'execute'),
  'visitors may not call it');

select * from finish();
rollback;
