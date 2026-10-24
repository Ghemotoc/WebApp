-- Database tests for reports (story S1-E10-01; CLAUDE.md rules 1, 6, 12 and 15).
-- What it proves:
-- - the shared contract: every reportable_type value has a branch in reportable_item_owner() and
--   reportable_item_summary(), so a user-content story that forgets its branch fails the build;
-- - any signed-in account can report, read-only ones included (kid_14_waiting, pending_check,
--   teen_17); a visitor can't; nobody reports their own item;
-- - the confirmation: a reference "R-000123" and the time; the same report within a day gives
--   the same reference; the hourly limit; details are limited to 2,000 characters;
-- - the row holds the reporter's age group and the reported account;
-- - policy reports_select_moderation: owner, admin and moderator read reports (allowed); the
--   reporter, support, the content editor and a visitor read none (denied); nobody inserts;
-- - stories and chapters (Lane A's types, branches added on rebase, architecture 1.7.11): a
--   published one can be reported and reads as its title or "Chapter N of <title>"; a draft
--   can't, so its existence never leaks; nobody reports their own story.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000002'::uuid as teen_17,
  '00000000-0000-4000-8000-000000000004'::uuid as kid_14_waiting,
  '00000000-0000-4000-8000-000000000005'::uuid as pending_check,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support,
  '00000000-0000-4000-8000-000000000012'::uuid as editor;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

/* ---------- 1. The shared contract ---------- */

-- Every enum value must appear as a `when 'value' then` branch in both functions.
select is_empty(
  $$ select value from unnest(enum_range(null::public.reportable_type)) as value
     where pg_get_functiondef('public.reportable_item_owner(public.reportable_type, text)'::regprocedure)
       !~ ('when ''' || value::text || ''' then') $$,
  'every reportable_type value has a branch in reportable_item_owner() (rule 6; shared contract)');
select is_empty(
  $$ select value from unnest(enum_range(null::public.reportable_type)) as value
     where pg_get_functiondef('public.reportable_item_summary(public.reportable_type, uuid)'::regprocedure)
       !~ ('when ''' || value::text || ''' then') $$,
  'every reportable_type value has a branch in reportable_item_summary() (shared contract)');
select is(public.reportable_item_summary('profile', (select adult_writer from ids)), '@adult_writer',
  'a profile is summarised by its username');

/* ---------- 2. Who may report ---------- */

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok($$ select * from public.report_item('profile', 'teen_17', 'spam') $$, '42501', null,
  'a visitor can''t report: the public form is S1-E10-02');

set local role authenticated;
select pg_temp.sign_in_as((select kid_14_waiting from ids));
select matches((select report_reference from public.report_item('profile', '@Adult_Writer', 'harassment', 'Keeps messaging me')),
  '^R-[0-9]{6}$', 'a read-only account (waiting for a parent) can report, and gets a reference');
select pg_temp.sign_in_as((select pending_check from ids));
select lives_ok($$ select * from public.report_item('profile', 'adult_writer', 'spam') $$,
  'an account with its age check pending can report');
select pg_temp.sign_in_as((select teen_17 from ids));
select lives_ok($$ select * from public.report_item('profile', 'adult_writer', 'hate') $$,
  'a 17-year-old (read-only in March) can report');
select pg_temp.sign_in_as((select adult_writer from ids));
select throws_ok($$ select * from public.report_item('profile', 'adult_writer', 'spam') $$, '23514', null,
  'nobody reports their own profile');
select throws_ok($$ select * from public.report_item('profile', 'no_such_person', 'spam') $$, '23514', null,
  'reporting a profile that doesn''t exist is refused');
select throws_ok($$ select * from public.report_item('profile', 'teen_17', 'other', repeat('x', 2001)) $$, '23514', null,
  'details are at most 2,000 characters');

/* ---------- 3. The confirmation and the limits ---------- */

create temp table first_report as select * from public.report_item('profile', 'teen_17', 'spam', 'Spam links');
grant select on first_report to authenticated;
select is((select report_reference from public.report_item('profile', 'teen_17', 'harassment')),
  (select report_reference from first_report),
  'the same item reported again within a day gives the same reference, not a new row');
reset role;
select is((select count(*)::integer from public.reports where user_id = (select adult_writer from ids)), 1,
  'and only one row exists for it');
select results_eq(
  $$ select reported_user_id, reporter_age_band::text, source, details from public.reports
     where user_id = (select adult_writer from ids) $$,
  $$ values ('00000000-0000-4000-8000-000000000002'::uuid, '18_plus', 'in_app', 'Spam links') $$,
  'the row holds the reported account, the reporter''s age group, the source and the details');
select is((select reporter_age_band::text from public.reports where user_id = (select kid_14_waiting from ids)),
  '13_to_15', 'a 14-year-old''s report carries the 13 to 15 age group, never a birth year');
-- The hourly limit: lower it to 2 for the test, then the third report is refused.
update public.settings set value = '2'::jsonb where key = 'report_hourly_limit';
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'kid_14_ok', 'spam') $$, 'a second item can be reported');
select throws_ok($$ select * from public.report_item('profile', 'blocker', 'spam') $$, '54000', null,
  'past the hourly limit a report is refused (setting report_hourly_limit)');

/* ---------- 4. Who reads reports ---------- */

select is_empty($$ select id from public.reports $$,
  'denied: reports_select_moderation: a reporter reads no reports, not even their own');
select throws_ok(
  $$ insert into public.reports (user_id, item_type, item_id, reported_user_id, reason, reporter_age_band, reference)
     values ((select adult_writer from ids), 'profile', (select teen_17 from ids), (select teen_17 from ids), 'spam', '18_plus', 'R-999999') $$,
  '42501', null, 'nobody inserts a report directly');
select pg_temp.sign_in_as((select support from ids));
select is_empty($$ select id from public.reports $$,
  'denied: reports_select_moderation: support reads no reports');
select pg_temp.sign_in_as((select editor from ids));
select is_empty($$ select id from public.reports $$,
  'denied: reports_select_moderation: a content editor reads no reports');
select pg_temp.sign_in_as((select moderator from ids));
select is((select count(*)::integer from public.reports where created_at = now()), 5,
  'allowed: reports_select_moderation: a moderator reads every report');
select pg_temp.sign_in_as((select admin from ids));
select isnt_empty($$ select id from public.reports $$,
  'allowed: reports_select_moderation: an admin reads reports too');

/* ---------- 5. Stories and chapters (Lane A's types) ---------- */

reset role;
-- Section 3 lowered the hourly limit to prove it; back to the setting's own value here.
update public.settings set value = '20'::jsonb where key = 'report_hourly_limit';
update public.stories set first_published_at = now() where id = '00000000-0000-4000-9000-000000000001';
insert into public.chapters (story_id, user_id, code, position, status, published_title, published_body)
values ('00000000-0000-4000-9000-000000000001', (select adult_writer from ids), 'rpt042ch', 99,
        'published', 'A chapter to report', 'Synthetic text.');
create temp table report_chapter as select id from public.chapters where code = 'rpt042ch';
grant select on report_chapter to authenticated;
set local role authenticated;
select pg_temp.sign_in_as((select teen_17 from ids));
create temp table story_report as
  select * from public.report_item('story', '00000000-0000-4000-9000-000000000001', 'spam');
create temp table chapter_report as
  select * from public.report_item('chapter', (select id::text from report_chapter), 'spam');
select throws_ok($$ select * from public.report_item('story', '00000000-0000-4000-9000-000000000002', 'spam') $$,
  '23514', null, 'a story that isn''t published can''t be reported: its existence never leaks');
select pg_temp.sign_in_as((select adult_writer from ids));
select throws_ok($$ select * from public.report_item('story', '00000000-0000-4000-9000-000000000001', 'spam') $$,
  '23514', null, 'nobody reports their own story');
reset role;
select is((select reported_user_id from public.reports where reference = (select report_reference from story_report)),
  (select adult_writer from ids), 'a published story is reported, against its writer');
select is(public.reportable_item_summary('story', '00000000-0000-4000-9000-000000000001'), 'Stația meteo',
  'the queue reads a story as its title');
select is(public.reportable_item_summary('chapter', (select id from public.chapters where code = 'rpt042ch')),
  'Chapter 99 of Stația meteo', 'and a chapter as "Chapter N of <story title>"');

select * from finish();

rollback;
