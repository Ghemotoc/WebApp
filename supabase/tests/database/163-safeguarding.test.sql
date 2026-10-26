-- Database tests for the safeguarding path (story S1-E10-10; CLAUDE.md rule 1; DSA art. 18).
-- What it proves:
-- - a self-harm report opens a safeguarding case only safeguarding staff see (criterion 3), and
--   a moderator can move another case into that lane;
-- - the case page gets the child helpline for the person's country, Romania's when there is none
--   (criterion 1);
-- - safeguarding staff build an evidence pack with the content, the account data and the
--   timestamps, logged as a sensitive read, and log the referral (criterion 2);
-- - policy safeguarding_referrals_select_safeguarding: the moderator with the permission allowed,
--   the admin without it denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000002'::uuid as teen_17,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- A known state: no open case on teen_17 or blocker; teen_17 lives in Ireland, blocker in a
-- country with no contacts in the table.
create temp table cleared as select id from public.cases where user_id in ((select teen_17 from ids), (select blocker from ids));
delete from public.notifications where case_id in (select id from cleared);
delete from public.sanctions where case_id in (select id from cleared);
delete from public.moderated_items where case_id in (select id from cleared);
delete from public.case_actions where case_id in (select id from cleared);
delete from public.public_notices where case_id in (select id from cleared);
delete from public.on_call_alerts where case_id in (select id from cleared);
delete from public.reports where case_id in (select id from cleared);
delete from public.cases where id in (select id from cleared);
update public.profiles set country_code = 'IE' where id = (select teen_17 from ids);
update public.profiles set country_code = 'IS' where id = (select blocker from ids);

/* ---------- 1. Who sees a safeguarding case (criterion 3) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'teen_17', 'self_harm', 'Says they want to hurt themself') $$,
  'a self-harm report on teen_17');
reset role;
create temp table child_case as select id from public.cases where user_id = (select teen_17 from ids) and status = 'open';
grant select on child_case to authenticated;
select ok((select is_safeguarding from public.cases where id = (select id from child_case)), 'opens a safeguarding case');
set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select is((select count(*)::integer from public.cases where id = (select id from child_case)), 0,
  'an admin without the safeguarding permission doesn''t see it');
select throws_ok($$ select public.admin_case_support_contacts((select id from child_case)) $$, '42501', null,
  'nor its support contacts');

/* ---------- 2. Support resources (criterion 1) ---------- */

select pg_temp.sign_in_as((select moderator from ids));
select is(public.admin_case_support_contacts((select id from child_case)) ->> 'country_code', 'IE',
  'the safeguarding moderator gets the contacts for the person''s country');
select ok(exists (select 1 from jsonb_array_elements(public.admin_case_support_contacts((select id from child_case)) -> 'contacts') as contact
                  where contact ->> 'kind' = 'child_helpline'),
  'with the child helpline');

/* ---------- 3. Moving a case into the lane ---------- */

select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'blocker', 'harassment', 'Messages a child to meet up') $$,
  'a harassment report that is really about a child');
reset role;
create temp table moved_case as select id from public.cases where user_id = (select blocker from ids) and status = 'open';
grant select on moved_case to authenticated;
set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select throws_ok($$ select public.admin_mark_safeguarding((select id from moved_case), '  ') $$, '23514', null,
  'moving a case needs a reason');
select lives_ok($$ select public.admin_mark_safeguarding((select id from moved_case), 'Grooming signs') $$,
  'any moderation staff member moves it into the safeguarding lane');
select is((select count(*)::integer from public.cases where id = (select id from moved_case)), 0,
  'after which they no longer see it themselves');
select pg_temp.sign_in_as((select moderator from ids));
select is(public.admin_case_support_contacts((select id from moved_case)) ->> 'country_code', 'RO',
  'a country with no contacts gets Romania''s');
select is((public.admin_case_support_contacts((select id from moved_case)) ->> 'is_fallback')::boolean, true,
  'and says so');

/* ---------- 4. The evidence pack and the referral (criterion 2) ---------- */

select pg_temp.sign_in_as((select admin from ids));
select throws_ok($$ select public.admin_build_evidence_pack((select id from child_case), 'Police asked') $$, '42501', null,
  'only safeguarding staff build an evidence pack');
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select public.admin_build_evidence_pack((select id from child_case), ' ') $$, '23514', null,
  'a pack needs a reason');
select is(public.admin_build_evidence_pack((select id from child_case), 'Credible risk to life') -> 'account' ->> 'handle', 'teen_17',
  'the pack holds the account''s data');
select ok(public.admin_build_evidence_pack((select id from child_case), 'Again') -> 'reports' -> 0 ? 'created_at',
  'and the reports with their timestamps');
reset role;
select is((select count(*)::integer from public.audit_log
           where action = 'safeguarding.evidence_pack_built' and target_id = (select id from child_case)::text), 2,
  'each pack is logged as a sensitive read');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select lives_ok($$ select public.admin_log_referral((select id from child_case), 'Poliția Română', 'DOS-123', 'Phoned 112 first') $$,
  'the referral is logged');
select is((select count(*)::integer from public.safeguarding_referrals where case_id = (select id from child_case)), 1,
  'allowed: safeguarding_referrals_select_safeguarding, the moderator with the permission reads it');
select pg_temp.sign_in_as((select admin from ids));
select is((select count(*)::integer from public.safeguarding_referrals), 0,
  'denied: safeguarding_referrals_select_safeguarding, an admin without the permission reads none');

select * from finish();
rollback;
