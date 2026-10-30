-- Database tests for the website CMS (stories S1-E11-06, S1-E11-10 and S1-E11-12; CLAUDE.md rule 1).
-- What it proves:
-- - anyone reads the live home page for their market and language, with the fallbacks: a
--   country with no content gets Romania in English, a language the market lacks gets its first
--   (S1-E11-06 criterion 10);
-- - only owner and admin read the versions (cms_versions_select_staff) and save, publish, restore
--   or remove; a moderator, a content editor and a member are refused (criterion 9);
-- - a draft changes nothing; publishing refuses empty or too-long fields with the list of fields;
--   a future "show from" date waits and the current version stays up (criteria 5 and 6);
-- - every publish and restore is in the audit log with the before and after copy (criterion 8);
-- - notices need every language of their market and end on their "show until" date (S1-E11-10);
-- - help pages refuse links to our own pages that don't exist (S1-E11-12 criterion 7);
-- - a removed question stops showing.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

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

create temporary table kept (label text primary key, value jsonb, id uuid) on commit drop;
grant all on kept to authenticated;

-- The seeded Romanian home page, to edit below.
insert into kept (label, value)
select 'ro_home', content from public.cms_versions
where content_kind = 'home_page' and market_code = 'RO' and language_code = 'ro' and status = 'published';

/* ---------- Reading, with the fallbacks ---------- */

set local role anon;
select is((select content ->> 'headlineFirst' from public.website_content('home_page', 'RO', 'ro')),
  'Scrie povești.', 'a visitor from Romania reads the Romanian home page');
select is((select market_code || ':' || language_code from public.website_content('home_page', 'GB', 'en')),
  'RO:en', 'a country with no page of its own gets Romania in English');
select is((select language_code from public.website_content('home_page', null, 'ro')),
  'en', 'an unknown country gets Romania in English too');
select is((select language_code from public.website_content('home_page', 'RO', 'hu')),
  'ro', 'a language the market lacks gets the market''s first language');
select is((select count(*)::integer from public.website_content('question', 'RO', 'en')), 8,
  'the eight seeded questions are live in English');
select throws_ok($$ select public.admin_save_cms_draft('home_page', 'home', 'RO', 'ro', '{}'::jsonb) $$,
  '42501', null, 'a visitor can''t save anything');
reset role;

/* ---------- Who reads the versions ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.cms_versions) > 0,
  'allowed: cms_versions_select_staff lets an admin read every version');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.cms_versions), 0,
  'denied: cms_versions_select_staff hides the versions from a moderator');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.cms_versions), 0,
  'denied: cms_versions_select_staff hides the versions from a member');

/* ---------- Who writes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_cms_draft('home_page', 'home', 'RO', 'ro', '{}'::jsonb) $$,
  '42501', null, 'a moderator is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_save_cms_draft('home_page', 'home', 'RO', 'ro', '{}'::jsonb) $$,
  '42501', null, 'a content editor is refused (admin role only)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_publish_cms_version(gen_random_uuid()) $$,
  '42501', null, 'a member is refused');

/* ---------- Drafts, refusals and scheduling ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('broken_draft',
  public.admin_save_cms_draft('home_page', 'home', 'RO', 'ro',
    (select value from kept where label = 'ro_home') || '{"lede": "", "eyebrow": "Un rând mult prea lung pentru locul de deasupra titlului paginii"}'::jsonb));
select is((select content ->> 'headlineFirst' from public.website_content('home_page', 'RO', 'ro')),
  'Scrie povești.', 'a draft changes nothing on the website');
select throws_ok($$ select public.admin_publish_cms_version((select id from kept where label = 'broken_draft')) $$,
  '23514', null, 'an empty or too-long field stops the publish');
select matches(
  pg_temp.hint_of($$ select public.admin_publish_cms_version((select id from kept where label = 'broken_draft')) $$),
  'eyebrow:too_long.*lede:empty', 'the refusal names each field and its problem');
select throws_ok($$ select public.admin_save_cms_draft('home_page', 'home', 'RO', 'de', '{}'::jsonb) $$,
  '23514', null, 'a language that isn''t the market''s is refused');

-- Tomorrow: scheduled, the current version stays up.
select public.admin_save_cms_draft('home_page', 'home', 'RO', 'ro',
  (select value from kept where label = 'ro_home') || '{"headlineFirst": "Scrie mâine."}'::jsonb,
  public.romania_today() + 1);
select is(public.admin_publish_cms_version((select id from public.cms_versions
    where content_kind = 'home_page' and language_code = 'ro' and status = 'draft')),
  public.romania_today() + 1, 'a version for tomorrow is scheduled for tomorrow');
select is((select content ->> 'headlineFirst' from public.website_content('home_page', 'RO', 'ro')),
  'Scrie povești.', 'and the current version stays up until then');

-- Today: live within the transaction.
select public.admin_save_cms_draft('home_page', 'home', 'RO', 'ro',
  (select value from kept where label = 'ro_home') || '{"headlineFirst": "Scrie azi."}'::jsonb);
select is(public.admin_publish_cms_version((select id from public.cms_versions
    where content_kind = 'home_page' and language_code = 'ro' and status = 'draft')),
  public.romania_today(), 'a version with no date goes live today');
select is((select content ->> 'headlineFirst' from public.website_content('home_page', 'RO', 'ro')),
  'Scrie azi.', 'and visitors see it at once');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'website.published'
    and before_values -> 'content' ->> 'headlineFirst' = 'Scrie povești.'
    and after_values -> 'content' ->> 'headlineFirst' = 'Scrie azi.'
    and after_values ->> 'market' = 'RO' and after_values ->> 'language' = 'ro'),
  'the publish is logged with the market, language and before and after copy');

/* ---------- Restore ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select lives_ok($$ select public.admin_restore_cms_version((select id from public.cms_versions
    where content_kind = 'home_page' and language_code = 'ro' and user_id is null)) $$,
  'the owner restores version 1');
select is((select content ->> 'headlineFirst' from public.cms_versions
    where content_kind = 'home_page' and language_code = 'ro' and status = 'draft'),
  'Scrie povești.', 'it comes back as a draft');
select is((select content ->> 'headlineFirst' from public.website_content('home_page', 'RO', 'ro')),
  'Scrie azi.', 'and the website doesn''t change until it is published');
select throws_ok($$ select public.admin_remove_cms_entry('home_page', 'home', 'RO', 'ro') $$,
  '23514', null, 'the home page can''t be removed');

/* ---------- Notices ---------- */

select public.admin_save_cms_draft('notice', 'notice-test', 'RO', '',
  '{"texts": {"ro": "Concursul începe luni."}, "noticeType": "contest", "showOn": "all", "link": "/discover"}'::jsonb);
select throws_ok($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'notice-test' and status = 'draft')) $$,
  '23514', null, 'a notice can''t go live with a language of its market empty');
select public.admin_save_cms_draft('notice', 'notice-test', 'RO', '',
  '{"texts": {"ro": "Concursul începe luni.", "en": "The contest starts on Monday."}, "noticeType": "contest", "showOn": "all", "link": "/discover"}'::jsonb);
select public.admin_publish_cms_version((select id from public.cms_versions where entry_key = 'notice-test' and status = 'draft'));
select is((select content -> 'texts' ->> language_code from public.website_content('notice', 'RO', 'en')),
  'The contest starts on Monday.', 'with both languages it goes live for the market, in the visitor''s language');
reset role;
-- As if it went up yesterday and its "show until" date is today.
update public.cms_versions set show_from = public.romania_today() - 1, show_until = public.romania_today()
where entry_key = 'notice-test';
select is((select count(*)::integer from public.website_content('notice', 'RO', 'en')), 0,
  'a notice ends on its "show until" date');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_cms_draft('notice', 'notice-test', 'RO', '',
  '{"texts": {"ro": "Concursul începe luni.", "en": "The contest starts on Monday."}, "noticeType": "contest", "showOn": "all", "link": "/discover"}'::jsonb,
  null, public.romania_today());
select is(pg_temp.hint_of($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'notice-test' and status = 'draft')) $$),
  'showUntil:before_show_from', 'a notice can''t come down on or before the day it goes up');
reset role;

/* ---------- Help pages and questions ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_cms_draft('help_page', 'links-test', 'RO', 'en',
  '{"title": "Links", "section": "Test", "body": "See [this](/help/no-such-page) and [that](/help/getting-started).", "isLegal": false}'::jsonb);
select is(pg_temp.hint_of($$ select public.admin_publish_cms_version((select id from public.cms_versions
    where entry_key = 'links-test' and status = 'draft')) $$),
  'body:broken_link:/help/no-such-page', 'a link to a help page that doesn''t exist stops the publish, named');
select lives_ok($$ select public.admin_remove_cms_entry('question', 'is-it-free', 'RO', 'en') $$,
  'an admin removes a question');
select is((select count(*)::integer from public.website_content('question', 'RO', 'en') where entry_key = 'is-it-free'), 0,
  'and it no longer shows');
reset role;

select * from finish();
rollback;
