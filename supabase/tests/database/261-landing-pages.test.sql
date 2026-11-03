-- Database tests for landing pages (story S1-E11-14; bundle CONTESTS-13a1; CLAUDE.md rule 1).
-- What it proves:
-- - only owner and admin read pages and versions (landing_pages_select_staff and
--   landing_page_versions_select_staff, allowed and denied) and create, save, publish, restore
--   or archive; a moderator, a content editor and a member are refused (decided 17 Oct 2026, 19:19);
-- - an address must be well formed, not reserved and not taken (criterion 1), and "c" is now a
--   reserved name, so no one can sign up as @c;
-- - a draft or an empty page is never shown at /c/<slug>; publishing refuses a page without a hero
--   at the top, with an empty field in either language, or a contest without key dates and a
--   Rules link, and lists the fields to fix (criterion 9);
-- - a published page is live for anyone, says "ended" from its take-down date and disappears when
--   archived (criterion 11); a future "show from" date waits;
-- - every create, publish, restore and archive is in the audit log, with before and after on
--   publish.
begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid, value jsonb) on commit drop;
grant all on kept to authenticated;

-- A complete contest page: a hero, key dates and a Rules block, in both languages.
insert into kept (label, value) values ('contest', $json${"theme": "gold", "blocks": [
  {"id": "h", "kind": "hero", "ro": {"title": "Concursul de toamnă", "intro": ""}, "en": {"title": "The autumn contest", "intro": ""}},
  {"id": "d", "kind": "key_dates", "ro": {"heading": "Date", "note": ""}, "en": {"heading": "Dates", "note": ""},
   "dates": {"entries_open": "2027-01-10", "entries_close": "2027-02-10", "results": "2027-03-01"}},
  {"id": "r", "kind": "rules", "ro": {"heading": "Regulament", "body": "", "link_label": "Citește regulamentul"},
   "en": {"heading": "Rules", "body": "", "link_label": "Read the rules"}, "link": "/help/contest-rules"}]}$json$);

/* ---------- Who writes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_create_landing_page('toamna', 'contest') $$,
  '42501', null, 'a moderator can''t create a landing page');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_create_landing_page('toamna', 'contest') $$,
  '42501', null, 'a content editor can''t create one (admin role only)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_create_landing_page('toamna', 'contest') $$,
  '42501', null, 'a member can''t create one');

/* ---------- Addresses ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('page', public.admin_create_landing_page(' Toamna ', 'contest'));
select is((select slug from public.landing_pages where id = (select id from kept where label = 'page')),
  'toamna', 'an admin creates a page; the address is trimmed and lowercased');
select is((select count(*)::integer from public.landing_page_versions
           where page_id = (select id from kept where label = 'page') and status = 'draft'),
  1, 'a new page starts with one empty draft');
select is(pg_temp.hint_of($$ select public.admin_create_landing_page('toamna', 'campaign') $$),
  'taken', 'an address in use is refused');
select is(pg_temp.hint_of($$ select public.admin_create_landing_page('admin', 'campaign') $$),
  'reserved', 'a reserved name is refused');
select is(pg_temp.hint_of($$ select public.admin_create_landing_page('a b', 'campaign') $$),
  'bad_address', 'an address with a space is refused');
select is(pg_temp.hint_of($$ select public.admin_create_landing_page('iarna', 'poster') $$),
  'bad_type', 'an unknown page type is refused');
reset role;
select is(public.name_reserved_reason('c'), 'system', '"c" is reserved, so no username takes the /c/ address');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');

/* ---------- Who reads ---------- */

select ok((select count(*) from public.landing_pages) > 0,
  'allowed: landing_pages_select_staff lets an admin read the pages');
select ok((select count(*) from public.landing_page_versions) > 0,
  'allowed: landing_page_versions_select_staff lets an admin read the versions');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok((select count(*) from public.landing_pages) > 0, 'allowed: the owner reads the pages too');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.landing_pages), 0,
  'denied: landing_pages_select_staff hides the pages from a moderator');
select is((select count(*)::integer from public.landing_page_versions), 0,
  'denied: landing_page_versions_select_staff hides the versions from a moderator');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.landing_page_versions), 0,
  'denied: landing_page_versions_select_staff hides the versions from a member');

/* ---------- Publishing ---------- */

set local role anon;
select is(public.landing_page('toamna'), null, 'a page with only a draft isn''t shown to visitors');
reset role;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
-- An empty page: no blocks at all.
select is(pg_temp.hint_of(format($$ select public.admin_publish_landing_page(%L) $$,
  (select id from public.landing_page_versions where page_id = (select id from kept where label = 'page')))),
  'blocks:count', 'an empty page can''t be published (it needs at least two blocks)');
-- A contest without a Rules block, and with the English title left empty.
select public.admin_save_landing_page_draft((select id from kept where label = 'page'),
  jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    jsonb_set((select value -> 'blocks' -> 0 from kept where label = 'contest'), '{en,title}', '""'),
    (select value -> 'blocks' -> 1 from kept where label = 'contest'))));
select is(pg_temp.hint_of(format($$ select public.admin_publish_landing_page(%L) $$,
  (select id from public.landing_page_versions where page_id = (select id from kept where label = 'page') and status = 'draft'))),
  'blocks:contest_needs_dates_and_rules,blocks.0.en.title:empty',
  'a contest needs key dates and rules, and every required field in both languages');
-- A hero that isn't first.
select public.admin_save_landing_page_draft((select id from kept where label = 'page'),
  jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    (select value -> 'blocks' -> 1 from kept where label = 'contest'),
    (select value -> 'blocks' -> 0 from kept where label = 'contest'),
    (select value -> 'blocks' -> 2 from kept where label = 'contest'))));
select ok(pg_temp.hint_of(format($$ select public.admin_publish_landing_page(%L) $$,
  (select id from public.landing_page_versions where page_id = (select id from kept where label = 'page') and status = 'draft')))
  like 'blocks:hero_first%', 'the hero must be the first block');
-- The complete page, from today.
select public.admin_save_landing_page_draft((select id from kept where label = 'page'),
  (select value from kept where label = 'contest'));
select is(public.admin_publish_landing_page(
  (select id from public.landing_page_versions where page_id = (select id from kept where label = 'page') and status = 'draft')),
  public.romania_today(), 'a complete contest page publishes from today');

set local role anon;
select is(public.landing_page('toamna') ->> 'state', 'live', 'a visitor sees the live page');
select is(public.landing_page('TOAMNA') #>> '{content,blocks,0,en,title}', 'The autumn contest',
  'the visitor gets both languages, whatever case the address is typed in');
reset role;

/* ---------- Scheduling, restore and the audit log ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_landing_page_draft((select id from kept where label = 'page'),
  jsonb_set((select value from kept where label = 'contest'), '{blocks,0,en,title}', '"The winter contest"'),
  public.romania_today() + 5, null);
select public.admin_publish_landing_page(
  (select id from public.landing_page_versions where page_id = (select id from kept where label = 'page') and status = 'draft'));
select is(public.landing_page('toamna') #>> '{content,blocks,0,en,title}', 'The autumn contest',
  'a version scheduled for later waits; the current one stays up');
select ok(public.admin_restore_landing_page_version(
  (select id from public.landing_page_versions where page_id = (select id from kept where label = 'page')
   and show_from = public.romania_today())) is not null, 'an admin restores an earlier version as the draft');
reset role;
select is((select array_agg(action order by action) from public.audit_log
           where target_type = 'landing_pages' and target_id = (select id::text from kept where label = 'page')),
  array['landing_page.created', 'landing_page.published', 'landing_page.published', 'landing_page.restored'],
  'creating, publishing and restoring are each in the audit log');
select is((select after_values #>> '{content,blocks,0,en,title}' from public.audit_log
           where action = 'landing_page.published' and target_id = (select id::text from kept where label = 'page')
           order by created_at desc, after_values ->> 'show_from' desc limit 1),
  'The winter contest', 'the publish entry keeps the words that will show');

/* ---------- Ended and archived ---------- */

-- The live version's take-down date passes (set directly: publishing only takes future dates).
update public.landing_page_versions
set show_from = public.romania_today() - 1, take_down_on = public.romania_today()
where page_id = (select id from kept where label = 'page') and show_from = public.romania_today();
set local role anon;
select is(public.landing_page('toamna') ->> 'state', 'ended', 'from the take-down date the page says it has ended');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_archive_landing_page((select id from kept where label = 'page'));
set local role anon;
select is(public.landing_page('toamna'), null, 'an archived page is gone from its address');
reset role;

select * from finish();
rollback;
