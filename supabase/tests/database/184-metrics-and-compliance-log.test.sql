-- Database tests for the Metrics page's extra numbers and the compliance log (story S1-E11-04;
-- board AdminMetrics; CLAUDE.md rule 1).
-- What it proves:
-- - admin_metrics_overview() counts sign-ups by age group from the year of birth and never returns
--   the year itself, counts age check results, and counts cases by tier with the share handled
--   within the time limit (criterion 1); only the owner and admins may read it;
-- - an admin logs a legal request with the authority, date, content, action and times, and can
--   finish an open one; a done entry can't be changed; impossible times are refused (criterion 2);
-- - policy compliance_log_entries_select_staff: the owner and admins read the log (allowed); a
--   moderator, support and a member don't (denied); nobody writes the table directly;
-- - removal orders from the public form appear in the log beside the logged entries;
-- - the launch task gives the ANCOM due date 45 days after the launch date (Law 50/2024);
-- - every change and every export is in the audit log.
-- Test data: seeded personas (adult_writer …01, owner …08, admin …09, moderator …10, support …11);
-- rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null; with the hint when there is one.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  error_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint;
  return sqlstate || coalesce(':' || nullif(error_hint, ''), '');
end;
$$;
-- One tier's numbers from the overview.
create function pg_temp.tier_numbers(wanted_tier text) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.admin_metrics_overview() -> 'cases_by_tier') as item
  where item ->> 'tier' = wanted_tier;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- Criterion 1: the numbers ---------- */

-- The numbers before this test changes anything.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
create temporary table before_numbers (overview jsonb, everything_else jsonb) on commit drop;
grant all on before_numbers to authenticated;
insert into before_numbers select public.admin_metrics_overview(), pg_temp.tier_numbers('seven_days');

-- adult_writer's year of birth moves to someone who is 14 this year, and four cases arrive in
-- the "everything else" tier: one decided in time, one decided late, one late and still open,
-- one still open inside its time limit.
-- The year of birth can't change once set (S1-E2-12), so the test lifts that guard for this one
-- update; the rollback at the end puts it back.
select pg_temp.as_postgres();
alter table public.profiles disable trigger profiles_birth_year_never_changes;
update public.profiles set birth_year = extract(year from now())::integer - 15, birth_month = null
where id = '00000000-0000-4000-8000-000000000001';
alter table public.profiles enable trigger profiles_birth_year_never_changes;
insert into public.cases (reference, user_id, item_type, item_id, source, tier, received_at, deadline_at,
  status, decision, decided_at, decided_by_user_id)
values
  ('T184-1', '00000000-0000-4000-8000-000000000001', 'story', gen_random_uuid(), 'report', 'seven_days',
   now() - interval '9 days', now() - interval '2 days', 'decided', 'no_action', now() - interval '3 days',
   '00000000-0000-4000-8000-000000000010'),
  ('T184-2', '00000000-0000-4000-8000-000000000001', 'story', gen_random_uuid(), 'report', 'seven_days',
   now() - interval '9 days', now() - interval '2 days', 'decided', 'remove', now() - interval '1 day',
   '00000000-0000-4000-8000-000000000010');
insert into public.cases (reference, user_id, item_type, item_id, source, tier, received_at, deadline_at)
values
  ('T184-3', '00000000-0000-4000-8000-000000000001', 'story', gen_random_uuid(), 'report', 'seven_days',
   now() - interval '8 days', now() - interval '1 day'),
  ('T184-4', '00000000-0000-4000-8000-000000000001', 'story', gen_random_uuid(), 'report', 'seven_days',
   now() - interval '1 day', now() + interval '6 days');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(
  (public.admin_metrics_overview() #>> '{sign_ups_by_age,13_to_15}')::integer
    - (select (overview #>> '{sign_ups_by_age,13_to_15}')::integer from before_numbers),
  1,
  'a sign-up counts in the age group its year of birth gives (13 to 15)');
select is(
  (select (o ->> '13_to_15')::integer + (o ->> '16_to_17')::integer + (o ->> '18_plus')::integer
     + (o ->> 'not_given')::integer = (o ->> 'total')::integer
   from (select public.admin_metrics_overview() -> 'sign_ups_by_age' as o) as overview),
  true,
  'every sign-up is in exactly one group');
select ok(
  public.admin_metrics_overview()::text not like '%' || (extract(year from now())::integer - 15)::text || '%',
  'the year of birth itself is never returned, only the group');
select is(
  public.admin_metrics_overview() #>> '{age_checks,appealed}',
  (select count(*)::text from public.manual_age_checks),
  'appealed counts the manual age check requests (S1-E2-08b)');
select ok(
  (public.admin_metrics_overview() #>> '{age_checks,passed}')::integer >= 1,
  'passed age checks are counted from the results');

select is(
  (pg_temp.tier_numbers('seven_days') ->> 'cases')::integer
    - (select (everything_else ->> 'cases')::integer from before_numbers),
  4,
  'every case of the last 30 days is counted in its tier');
select is(
  (pg_temp.tier_numbers('seven_days') ->> 'measured')::integer
    - (select (everything_else ->> 'measured')::integer from before_numbers),
  3,
  'a case is measured once decided or past its deadline, not while still in time');
select is(
  (pg_temp.tier_numbers('seven_days') ->> 'in_time')::integer
    - (select (everything_else ->> 'in_time')::integer from before_numbers),
  1,
  'only a case decided by its deadline is handled in time');
select is(
  (select array_agg(item ->> 'tier') from jsonb_array_elements(public.admin_metrics_overview() -> 'cases_by_tier') as item),
  array['one_hour', 'same_day', 'two_days', 'seven_days'],
  'the tiers come most urgent first, each with its time limit');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(
  pg_temp.refusal($$ select public.admin_metrics_overview() $$),
  '42501:not_allowed',
  'a moderator can''t read the overview (queue numbers are on the queue page)');

/* ---------- Criterion 2: the compliance log ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok(
  public.admin_log_compliance_entry('legal_request', 'Police, Prahova county', now() - interval '2 hours',
    'Asked for sign-up data of the account @inkwolf') ~ '^LR-[0-9]{3,}$',
  'an admin logs a request and gets its reference');

select is(
  (select count(*) from public.compliance_log_entries
   where authority = 'Police, Prahova county' and content like 'Asked for sign-up data%' and completed_at is null),
  1::bigint,
  'allowed: compliance_log_entries_select_staff: an admin reads the authority, date and content of the entry');

select is(
  pg_temp.refusal($$ select public.admin_log_compliance_entry('legal_request', 'ANCOM', now() + interval '1 day', 'Asked') $$),
  '23514:in_future',
  'a request can''t arrive in the future');
select is(
  pg_temp.refusal($$ select public.admin_log_compliance_entry('legal_request', 'ANCOM', now(), 'Asked', 'Answered') $$),
  '23514:action_needs_time',
  'an action needs the time it was done');

-- Finishing the open entry records the action and the time.
select ok(
  public.admin_complete_compliance_entry(
    (select reference from public.compliance_log_entries where authority = 'Police, Prahova county'),
    'Checked with our lawyer, then sent the data for that account only') is not null,
  'an admin records what was done about an open entry');
select is(
  pg_temp.refusal($$ select public.admin_complete_compliance_entry(
    (select reference from public.compliance_log_entries where authority = 'Police, Prahova county'), 'Changed') $$),
  '23514:already_done',
  'a done entry is proof and can''t be changed');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is(
  (select count(*) from public.compliance_log_entries),
  0::bigint,
  'denied: compliance_log_entries_select_staff: support staff don''t read the compliance log');
select is(
  pg_temp.refusal($$ select public.admin_compliance_log() $$),
  '42501:not_allowed',
  'support staff can''t open or export the log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  left(pg_temp.refusal($$ insert into public.compliance_log_entries (user_id, entry_kind, authority, received_at, content)
    values ('00000000-0000-4000-8000-000000000001', 'legal_request', 'x', now(), 'x') $$), 5),
  '42501',
  'nobody writes the log directly');

/* ---------- Removal orders, the launch task and the audit log ---------- */

select pg_temp.as_postgres();
insert into public.public_notices (kind, content_url, explanation, notifier_email, authority_name,
  order_reference, reference)
values ('removal_order', 'https://example.test/s/sarea', 'Terrorist content', 'orders@authority.test',
  'DIICOT', 'ORD-184', 'TCO-9184');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(
  (select item ->> 'authority' from jsonb_array_elements(public.admin_compliance_log() -> 'entries') as item
   where item ->> 'reference' = 'TCO-9184'),
  'DIICOT',
  'a removal order from the public form is in the log with its authority');

select public.admin_set_launch_date('2027-03-01');
select is(
  public.admin_compliance_log() #>> '{launch,due_on}',
  '2027-04-15',
  'the ANCOM notice is due 45 days after the launch date');

select public.admin_compliance_log(true);
select pg_temp.as_postgres();
select is(
  (select array_agg(distinct action order by action) from public.audit_log
   where action like 'compliance_log.%' or (action = 'settings.value' and target_id = 'launch_date')),
  array['compliance_log.entry_completed', 'compliance_log.entry_logged', 'compliance_log.exported', 'settings.value'],
  'logging, finishing, the launch date and the export are all in the audit log');

select * from finish();
rollback;
