-- Database test: ready-made layouts and copying for landing pages (story S1-E11-35, CMS-2c).
-- Covers: a page can start from a layout's content in one call, logged with the layout's name
-- (criterion 1); an unknown layout or an oversized start is refused; Copy page makes a new draft
-- of the same type at its own address with the source's newest words, nothing live, and logs
-- where it came from (criteria 3 and 4); someone without the landing pages area can't copy.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated;

-- 1. A moderator starts a page from the contest layout.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into kept (label, id) select 'layout', public.admin_create_landing_page('layout-test', 'contest',
  '{"theme": "plum", "blocks": [{"id": "h", "kind": "hero", "ro": {"title": "Concurs", "intro": ""}, "en": {"title": "Contest", "intro": ""}}]}',
  'contest');
reset role;
select is((select content #>> '{blocks,0,en,title}' from public.landing_page_versions
           where page_id = (select id from kept where label = 'layout')), 'Contest',
  'the first draft holds the layout''s blocks and starter words');
select is((select status::text from public.landing_page_versions
           where page_id = (select id from kept where label = 'layout')), 'draft',
  'a page from a layout starts as a draft');
select is((select after_values ->> 'layout' from public.audit_log
           where action = 'landing_page.created' and target_id = (select id from kept where label = 'layout')::text),
  'contest', 'the audit log names the layout');

-- A blank page still works with two arguments.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into kept (label, id) select 'blank', public.admin_create_landing_page('blank-test', 'information');
reset role;
select is((select content from public.landing_page_versions
           where page_id = (select id from kept where label = 'blank')), '{"theme": "plum", "blocks": []}'::jsonb,
  'a blank page starts with an empty draft');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$select public.admin_create_landing_page('odd-layout-test', 'campaign', '{}', 'magazine')$$,
  '23514', 'Pick a layout from the list.', 'an unknown layout is refused');
select throws_ok($$select public.admin_create_landing_page('list-test', 'campaign', '[1, 2]', 'plain')$$,
  '23514', 'That layout can''t be used.', 'a start that isn''t one page object is refused');
select throws_ok($$select public.admin_create_landing_page('big-test', 'campaign', jsonb_build_object('x', repeat('x', 600000)), 'event')$$,
  '23514', 'This page is too big to save.', 'an oversized start is refused');

-- 3. Copy page: the same type, the source's draft, a draft itself, at its own address.
insert into kept (label, id) select 'copy',
  public.admin_copy_landing_page((select id from kept where label = 'layout'), 'layout-test-copy');
reset role;
select is((select page_type from public.landing_pages where id = (select id from kept where label = 'copy')),
  'contest', 'the copy has the source''s type');
select is((select content #>> '{blocks,0,ro,title}' from public.landing_page_versions
           where page_id = (select id from kept where label = 'copy')), 'Concurs',
  'the copy''s draft holds the source''s words');
select is((select count(*)::int from public.landing_page_versions
           where page_id = (select id from kept where label = 'copy') and status <> 'draft'), 0,
  'nothing of the copy is live until it is published');
-- 4. Every copy is in the audit log, with the page it came from.
select is((select after_values ->> 'copied_from_slug' from public.audit_log
           where action = 'landing_page.copied' and target_id = (select id from kept where label = 'copy')::text),
  'layout-test', 'the audit log says which page the copy came from');

-- The copy's address follows the same rules as a new page's.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$select public.admin_copy_landing_page(%L, 'layout-test')$$, (select id from kept where label = 'layout')),
  '23514', 'That address can''t be used.', 'a copy can''t take an address in use');

-- Support has no landing pages area, so can't copy.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok(format($$select public.admin_copy_landing_page(%L, 'support-copy-test')$$, (select id from kept where label = 'layout')),
  '42501', null, 'support can''t copy a page');
reset role;

select * from finish();
rollback;
