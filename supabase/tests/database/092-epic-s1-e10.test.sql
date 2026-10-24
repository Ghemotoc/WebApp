-- Epic check for S1-E10, Reporting, moderation and safety (story S1-E10-QA).
-- It adds no feature: it walks the epic's main journey through the database, crossing the March
-- stories built so far (S1-E10-01, S1-E10-03a, S1-E10-06, S1-E10-13a), with the personas the story
-- names. S1-E10-02, 04, 05, 08, 09 and 10 are not built yet (docs/epic-reports/S1-E10.md).
-- Journey (S1-E10-01 × S1-E10-03a × S1-E10-06):
--   kid_14_waiting, read-only in March, reports adult_writer's profile → a 7-day case opens →
--   teen_17 reports the same profile for self-harm → the case becomes same day and safeguarding,
--   hidden from the admin persona (no permission) and seen by the moderator → the moderator
--   suspends adult_writer for 7 days from the case → adult_writer is read-only, sees the
--   suspension, still reads → the moderator pauses kid_14_waiting's reporting → their next report
--   is refused → the suspension is lifted → adult_writer writes again; every step is logged.
-- Safety contacts (S1-E10-13a): Romania's contacts are there for everyone; a country with no row
--   is counted for staff, never who asked.
-- The CTO's reasons (24 Oct 2026): a "Threat to a minor" report opens a same-day safeguarding case
--   the admin persona can't see and the moderator can (test 044 covers "Insults").
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000002'::uuid as teen_17,
  '00000000-0000-4000-8000-000000000004'::uuid as kid_14_waiting,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- The seed's cases, reports and sanctions on adult_writer are cleared so the journey starts clean.
create temp table cleared as select id from public.cases where user_id = (select adult_writer from ids);
delete from public.banned_email_hashes where sanction_id in (select id from public.sanctions where case_id in (select id from cleared));
delete from public.sanctions where user_id = (select adult_writer from ids) or case_id in (select id from cleared);
delete from public.moderated_items where case_id in (select id from cleared);
delete from public.case_actions where case_id in (select id from cleared);
delete from public.reports where case_id in (select id from cleared);
delete from public.cases where id in (select id from cleared);

/* ---------- 1. A read-only minor reports; the case opens (S1-E10-01 × S1-E10-03a) ---------- */

-- account_state() is not callable by members (it would show others' age state), so it is read
-- as the database owner before signing in.
select is(public.account_state((select kid_14_waiting from ids))::text, 'minor_not_admitted',
  'kid_14_waiting is read-only in March (adults only), and can still report (architecture 1.7.8)');
set local role authenticated;
select pg_temp.sign_in_as((select kid_14_waiting from ids));
create temp table first as select * from public.report_item('profile', 'adult_writer', 'harassment', 'Keeps mocking my pen name');
grant select on first to authenticated;
reset role;
create temp table opened as select id from public.cases where user_id = (select adult_writer from ids) and status = 'open';
grant select on opened to authenticated;
select results_eq(
  $$ select tier::text, report_count, reporter_under_18, is_safeguarding from public.cases where id = (select id from opened) $$,
  $$ values ('seven_days', 1, true, false) $$,
  'the report opened a 7-day case flagged "reporter under 18"');

/* ---------- 2. A second report makes it safeguarding; who sees it (S1-E10-03a) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select teen_17 from ids));
select lives_ok($$ select * from public.report_item('profile', 'adult_writer', 'self_harm') $$, 'teen_17 reports the same profile for self-harm');
reset role;
select results_eq(
  $$ select tier::text, report_count, is_safeguarding from public.cases where id = (select id from opened) $$,
  $$ values ('same_day', 2, true) $$,
  'the case is now same day, safeguarding, with two reports');
set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select is_empty($$ select id from public.admin_moderation_queue() where id = (select id from opened) $$,
  'the admin persona, without the safeguarding permission, does not see it');
select pg_temp.sign_in_as((select moderator from ids));
select isnt_empty($$ select id from public.admin_moderation_queue(tier_filter => 'same_day') where id = (select id from opened) $$,
  'the moderator, with the permission, sees it in the same-day tier');
select results_eq(
  $$ select reporter_handle, reporter_age_band::text from public.admin_case_reports((select id from opened)) order by reference $$,
  $$ values ('kid_14_waiting', '13_to_15'), ('teen_17', '16_to_17') $$,
  'the case page shows each reporter by username and age group, never a birth year');

/* ---------- 3. The decision carries a suspension out (S1-E10-03a × S1-E10-06) ---------- */

select ok(public.admin_decide_case((select id from opened), 'suspend', 'Two reports in a day; a 7-day suspension', 7),
  'the moderator suspends adult_writer for 7 days from the case');
reset role;
select is(public.account_state((select adult_writer from ids))::text, 'suspended', 'adult_writer is suspended');
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select ok(not public.is_active_member(), 'and can''t write');
select results_eq($$ select kind::text from public.my_sanctions() $$, $$ values ('suspension') $$,
  'but sees the suspension and its dates (not the note)');
select lives_ok($$ select count(*) from public.safety_contacts where country_code = 'RO' $$,
  'and still reads: the safety contacts, for one');

/* ---------- 4. The reporting pause, and the lift (S1-E10-06 × S1-E10-01) ---------- */

select pg_temp.sign_in_as((select moderator from ids));
select lives_ok($$ select public.admin_pause_reporting('kid_14_waiting', (select id from opened), 'Reports found unfounded again and again') $$,
  'the moderator pauses kid_14_waiting''s reporting');
select pg_temp.sign_in_as((select kid_14_waiting from ids));
select throws_ok($$ select * from public.report_item('profile', 'teen_17', 'spam') $$, '55000', null,
  'kid_14_waiting''s next report is refused while the pause lasts');
select pg_temp.sign_in_as((select moderator from ids));
select ok(public.admin_lift_sanction(
  (select id from public.sanctions where user_id = (select adult_writer from ids) and kind = 'suspension' and lifted_at is null),
  'Appeal upheld'), 'the suspension is lifted early');
reset role;
select is(public.account_state((select adult_writer from ids))::text, 'active', 'adult_writer writes again');
select results_eq(
  $$ select action from public.audit_log where created_at >= now() and target_user_id in ((select adult_writer from ids), (select kid_14_waiting from ids)) order by action $$,
  $$ values ('case.decided'), ('sanction.applied'), ('sanction.applied'), ('sanction.lifted') $$,
  'every staff step of the journey is in the audit log');

/* ---------- 5. The two reasons the CTO added (S1-E10-01 × S1-E10-03a, 24 Oct 2026) ---------- */

reset role;
-- The seed's cases on teen_17 are cleared the same way, so these reports open fresh cases.
create temp table cleared_teen as select id from public.cases where user_id = (select teen_17 from ids);
delete from public.banned_email_hashes where sanction_id in (select id from public.sanctions where case_id in (select id from cleared_teen));
delete from public.sanctions where case_id in (select id from cleared_teen);
delete from public.moderated_items where case_id in (select id from cleared_teen);
delete from public.case_actions where case_id in (select id from cleared_teen);
delete from public.reports where case_id in (select id from cleared_teen);
delete from public.cases where id in (select id from cleared_teen);
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'teen_17', 'threat_to_minor', 'Asks them to meet in secret') $$,
  'adult_writer reports teen_17''s profile as a threat to a minor');
select pg_temp.sign_in_as((select admin from ids));
select is_empty(
  $$ select id from public.admin_moderation_queue() where reported_handle = 'teen_17' $$,
  'the admin persona, without the safeguarding permission, doesn''t see that case');
select pg_temp.sign_in_as((select moderator from ids));
select results_eq(
  $$ select tier::text, top_reason::text from public.admin_moderation_queue() where reported_handle = 'teen_17' $$,
  $$ values ('same_day', 'threat_to_minor') $$,
  'the moderator with the permission sees it on the same-day tier');

/* ---------- 6. Safety contacts for everyone (S1-E10-13a) ---------- */

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select ok((select count(*) >= 3 from public.safety_contacts where country_code = 'RO'),
  'a visitor reads Romania''s contacts (emergency, children''s helpline, where to report abuse images)');
select lives_ok($$ select public.note_safety_contact_gap('FR') $$, 'a visitor from a country with no row is counted, not recorded');
select throws_ok($$ select count(*) from public.safety_contact_gaps $$, '42501', null,
  'and has no read on the gap counts at all (staff do)');

select * from finish();

rollback;
