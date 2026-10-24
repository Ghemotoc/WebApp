-- Database tests for the moderation queue, part a (story S1-E10-03a; CLAUDE.md rule 1).
-- What it proves:
-- - every case comes from a report (here), an order or a picture check: nobody inserts a case
--   directly and nothing screens text;
-- - tiers (decided 23 Oct 2026, Q5): self-harm, child sexual content and terrorism the same day,
--   illegal content, copyright and copied work 48 hours, the rest 7 days; the one-hour tier is for
--   authority orders only (the table refuses it for a reason); every reason has a tier; a threat
--   to a minor is same-day safeguarding and insults sit with harassment (CTO, 24 Oct 2026);
-- - several reports of one item are one case (Q4): the count grows, the more urgent reason sets
--   the tier, the deadline counts from the first report and the earliest wins, an under-18
--   reporter flags the case, a safeguarding reason makes it a safeguarding case;
-- - a decision needs an action and a note, closes the case and its reports, is written to the
--   audit log with before and after values, and a decided case can't be decided again;
-- - policies: cases_select_moderation, case_actions_select_moderation and
--   report_reason_tiers_select_moderation (a moderator allowed; support, a member and a visitor
--   denied); a safeguarding case is hidden from an admin without the permission and shown to the
--   moderator with it (allowed and denied); the tightened reports policy follows the case.
begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000002'::uuid as teen_17,
  '00000000-0000-4000-8000-000000000003'::uuid as kid_14_ok,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker,
  '00000000-0000-4000-8000-000000000016'::uuid as blocked;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- A clean slate for the items this test reports: the seed's reports and cases on them are
-- removed first (a repeat report within a day would otherwise return the seed's reference), so
-- the new reports open fresh cases with known values.
create temp table cleared as select id from public.cases
  where user_id in ((select blocker from ids), (select blocked from ids));
delete from public.case_actions where case_id in (select id from cleared);
delete from public.reports where case_id in (select id from cleared);
delete from public.cases where id in (select id from cleared);

/* ---------- 1. Where cases come from, and the tiers ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok(
  $$ insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
     values ('X-1', (select blocked from ids), 'profile', (select blocked from ids), 'report', 'seven_days', now()) $$,
  '42501', null, 'nobody inserts a case directly: cases come from reports, orders and picture checks');
select throws_ok(
  $$ update public.report_reason_tiers set tier = 'one_hour' where reason = 'terrorism' $$,
  '42501', null, 'the tier map is changed by migration only');
reset role;
select throws_ok(
  $$ update public.report_reason_tiers set tier = 'one_hour' where reason = 'terrorism' $$,
  '23514', null, 'the one-hour tier is for authority orders only, by constraint (Q5; TCO art. 3(3))');
select results_eq(
  $$ select reason::text, tier::text, is_safeguarding from public.report_reason_tiers
     where reason in ('self_harm', 'terrorism', 'copyright', 'spam') order by reason $$,
  $$ values ('copyright', 'two_days', false), ('self_harm', 'same_day', true),
            ('spam', 'seven_days', false), ('terrorism', 'same_day', false) $$,
  'the tiers follow the decision of 23 Oct 2026 (Q5)');
select results_eq(
  $$ select reason::text, tier::text, is_safeguarding from public.report_reason_tiers
     where reason in ('threat_to_minor', 'insults', 'harassment') order by reason $$,
  $$ values ('harassment', 'seven_days', false), ('insults', 'seven_days', false),
            ('threat_to_minor', 'same_day', true) $$,
  'a threat to a minor is a same-day safeguarding case; insults sit with harassment (CTO, 24 Oct 2026)');
select is_empty(
  $$ select unnest(enum_range(null::public.report_reason)) except select reason from public.report_reason_tiers $$,
  'every report reason has a tier, so a new reason can''t open a case without one');

/* ---------- 2. One case per item, grouped ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
create temp table first as select * from public.report_item('profile', 'blocked', 'spam', 'Spam links everywhere');
grant select on first to authenticated;
reset role;
create temp table opened as select * from public.cases where item_id = (select blocked from ids) and status = 'open';
grant select on opened to authenticated;
select results_eq(
  $$ select reference, source::text, tier::text, report_count, reporter_under_18, is_safeguarding,
            deadline_at = received_at + interval '168 hours' from opened $$,
  $$ select report_reference, 'report', 'seven_days', 1, false, false, true from first $$,
  'a spam report opens a 7-day case referenced like the report, with its deadline from the report');
set local role authenticated;
select pg_temp.sign_in_as((select kid_14_ok from ids));
select lives_ok($$ select * from public.report_item('profile', 'blocked', 'self_harm') $$,
  'a 14-year-old reports the same profile for self-harm');
reset role;
select results_eq(
  $$ select report_count, tier::text, top_reason::text, reporter_under_18, is_safeguarding,
            deadline_at = received_at + interval '24 hours'
     from public.cases where id = (select id from opened) $$,
  $$ values (2, 'same_day', 'self_harm', true, true, true) $$,
  'the second report joins the case: 2 reports, the more urgent reason wins, the deadline moves earlier, the under-18 flag and safeguarding are set');
select is((select count(*)::integer from public.cases where item_id = (select blocked from ids) and status = 'open'), 1,
  'one open case per item (Q4)');
select is((select case_id from public.reports where reference = (select report_reference from first)),
  (select id from opened), 'the report points at its case');

/* ---------- 3. Who sees what ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select is_empty(
  $$ select id from public.cases where id = (select id from opened) $$,
  'denied: cases_select_moderation: an admin without the safeguarding permission can''t see a safeguarding case');
select is_empty(
  $$ select id from public.reports where case_id = (select id from opened) $$,
  'denied: reports_select_moderation: nor its reports');
select is_empty(
  $$ select * from public.admin_moderation_queue() where id = (select id from opened) $$,
  'the queue leaves the safeguarding case out for them too');
select pg_temp.sign_in_as((select moderator from ids));
select isnt_empty(
  $$ select id from public.cases where id = (select id from opened) $$,
  'allowed: cases_select_moderation: the moderator with the safeguarding permission sees it');
select isnt_empty(
  $$ select id from public.reports where case_id = (select id from opened) $$,
  'allowed: reports_select_moderation: and its reports');
select isnt_empty($$ select id from public.report_reason_tiers $$,
  'allowed: report_reason_tiers_select_moderation: a moderator reads the tier map');
select results_eq(
  $$ select reference, item_summary, reported_handle, tier::text, report_count
     from public.admin_moderation_queue(tier_filter => 'same_day') where id = (select id from opened) $$,
  $$ select report_reference, '@blocked', 'blocked', 'same_day', 2 from first $$,
  'the queue shows the case with what was reported, whose it is, its tier and its report count');
select results_eq(
  $$ select reason::text, reporter_handle, reporter_age_band::text from public.admin_case_reports((select id from opened)) order by reference $$,
  $$ values ('spam', 'adult_writer', '18_plus'), ('self_harm', 'kid_14_ok', '13_to_15') $$,
  'the case page lists each report with the reporter''s username and age group');
select pg_temp.sign_in_as((select support from ids));
select is_empty($$ select id from public.cases $$, 'denied: cases_select_moderation: support reads no cases');
select is_empty($$ select id from public.report_reason_tiers $$,
  'denied: report_reason_tiers_select_moderation: support reads no tier map');
select throws_ok($$ select * from public.admin_moderation_queue() $$, '42501', null, 'support can''t open the queue');
select pg_temp.sign_in_as((select adult_writer from ids));
select is_empty($$ select id from public.cases $$, 'denied: cases_select_moderation: a member reads no cases');
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok($$ select id from public.case_actions $$, '42501', null,
  'denied: case_actions_select_moderation: a visitor has no read on decisions at all');

/* ---------- 4. The decision ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select support from ids));
select throws_ok($$ select public.admin_decide_case((select id from opened), 'warn', 'Note') $$, '42501', null,
  'support can''t decide a case');
select pg_temp.sign_in_as((select admin from ids));
select throws_ok($$ select public.admin_decide_case((select id from opened), 'warn', 'Note') $$, '42501', null,
  'an admin without the safeguarding permission can''t decide a safeguarding case');
reset role;
select ok(public.content_is_held_for_moderation('profile', (select blocked from ids)),
  'while the case is open the item is held from the purge (Lane A''s stand-in, filled in)');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select public.admin_decide_case((select id from opened), 'warn', '  ') $$, '23514', null,
  'a decision needs a note');
select ok(public.admin_decide_case((select id from opened), 'warn', 'First warning; the links were spam and the self-harm post is being checked'),
  'the moderator decides with an action and a note');
select results_eq(
  $$ select status::text, decision::text, decided_by_user_id from public.cases where id = (select id from opened) $$,
  $$ values ('decided', 'warn', '00000000-0000-4000-8000-000000000010'::uuid) $$,
  'the case is decided, by the moderator');
select is((select count(*)::integer from public.reports where case_id = (select id from opened) and closed_at is null), 0,
  'its reports are closed');
select results_eq(
  $$ select action::text, staff_handle from public.admin_case_actions((select id from opened)) $$,
  $$ values ('warn', 'moderator') $$,
  'allowed: case_actions_select_moderation: the decision shows on the case page with who made it');
select throws_ok($$ select public.admin_decide_case((select id from opened), 'ban', 'Again') $$, '23514', null,
  'a decided case can''t be decided again (appeals are S1-E10-07)');
reset role;
select ok(not public.content_is_held_for_moderation('profile', (select blocked from ids)),
  'once decided it is no longer held');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
-- The audit log is read by owner and admin only (S1-E11-01), so the check runs as the database owner.
reset role;
select results_eq(
  $$ select action, target_user_id, before_values ->> 'status', after_values ->> 'action'
     from public.audit_log where action = 'case.decided' and target_id = (select id from opened)::text $$,
  $$ values ('case.decided', '00000000-0000-4000-8000-000000000016'::uuid, 'open', 'warn') $$,
  'the decision is in the audit log with the account, the values before and after');

select * from finish();

rollback;
