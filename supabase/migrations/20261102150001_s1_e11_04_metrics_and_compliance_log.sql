/*
 * Migration: more numbers for the staff Metrics page and the compliance log (story S1-E11-04;
 * board AdminMetrics, screen 8.7; architecture 1.8.2: Metrics and logs).
 *
 * What it adds:
 * - admin_metrics_overview(): sign-ups by age group (counted from the year of birth), age check
 *   results, and moderation cases by tier with the share handled within the tier's time limit
 *   (criterion 1). Live totals only: nothing here lists or names a person.
 * - compliance_log_entries: authority orders, legal requests and the ANCOM launch notice that staff
 *   log by hand, each with the authority, the date, the content, the action taken and the times
 *   (criterion 2). Removal orders that arrive through the public form (S1-E10-02, S1-E10-09) are
 *   already recorded with their timeline; admin_compliance_log() lists them beside these entries.
 * - admin_log_compliance_entry(), admin_complete_compliance_entry(), admin_set_launch_date(),
 *   admin_compliance_log(): owner and admin only (staff area compliance_log), each change and each
 *   export written to the audit log in the same transaction (architecture 1.8.1).
 * - The launch task: ANCOM must be notified within 45 days of launch (Law 50/2024, the story's
 *   legal note). The launch date is a setting; the page shows the due date and whether the notice
 *   is logged as done.
 * Transparency reports are not required for micro and small enterprises (DSA art. 15(2)); the data
 * is kept so we are ready when we grow (the story's legal note).
 * Who calls it: src/features/staff/api/metricsOverview.ts and api/complianceLog.ts.
 * Tests: supabase/tests/database/184-metrics-and-compliance-log.test.sql.
 */

/* ---------- Who may use it ---------- */

-- Architecture 1.8.3: Metrics and logs is View for owner and admin; logging a legal request is an
-- action, so the compliance log is its own area that only they hold.
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('compliance_log', 'owner', 'act', null), ('compliance_log', 'admin', 'act', null)
on conflict (role, area) do nothing;

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('launch_date', '""'::jsonb, false,
   'The public launch date, "YYYY-MM-DD", or empty until it is set; the ANCOM notice is due from it (S1-E11-04).'),
  ('ancom_notice_days', '45'::jsonb, false,
   'Days after launch by which ANCOM must be notified (Law 50/2024; S1-E11-04).'),
  ('tier_numbers_days', '30'::jsonb, false,
   'How many days of moderation cases the Metrics page counts by tier (S1-E11-04; proposal).')
on conflict (key) do nothing;

/* ---------- The numbers ---------- */

/**
 * sign_ups_by_age_group: accounts by age group today, counted from the year of birth.
 * Returns: JSON {13_to_15, 16_to_17, 18_plus, not_given, total}. The same accounts as the signed-up
 *   readers (confirmed, live, not staff, not the classics account). The year of birth itself is
 *   never returned (architecture 1.8.3: staff see the age group only). Under-13 years can't be
 *   saved (S1-E2-02), so any such row counts as not given.
 * Internal: admin_metrics_overview().
 */
create or replace function public.sign_ups_by_age_group()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with members as (
    select public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
      profiles.age_check_result, (now() at time zone 'Europe/Bucharest')::date) as band
    from public.profiles
    join auth.users on users.id = profiles.id
    where profiles.deleted_at is null
      and users.email_confirmed_at is not null
      and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id)
      and profiles.handle is distinct from (public.setting_value('classics_account_handle') #>> '{}')
  )
  select jsonb_build_object(
    '13_to_15', count(*) filter (where band = '13_to_15'),
    '16_to_17', count(*) filter (where band = '16_to_17'),
    '18_plus', count(*) filter (where band = '18_plus'),
    'not_given', count(*) filter (where band in ('unknown', 'under_13')),
    'total', count(*))
  from members;
$$;
comment on function public.sign_ups_by_age_group() is
  'Internal: accounts by age group from the year of birth, totals only (S1-E11-04).';
revoke execute on function public.sign_ups_by_age_group() from public, anon, authenticated;

/**
 * age_check_numbers: how the age checks ended, as totals.
 * Returns: JSON {passed, failed, not_finished, appealed}. Passed is a "13 or over" or "18 or over"
 *   result. Appealed is null: manual checks after a failed result arrive with the age check itself
 *   (S1-E2-08, after March), and the page says so. Only results are kept, never a photo or a
 *   document (CLAUDE.md rule 5).
 * Internal: admin_metrics_overview().
 */
create or replace function public.age_check_numbers()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'passed', count(*) filter (where age_check_result in ('13_or_over', '18_or_over')),
    'failed', count(*) filter (where age_check_result = 'failed'),
    'not_finished', count(*) filter (where age_check_result = 'pending'),
    'appealed', null)
  from public.profiles
  where deleted_at is null
    and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id);
$$;
comment on function public.age_check_numbers() is
  'Internal: age check results as totals; appeals come with S1-E2-08 (S1-E11-04).';
revoke execute on function public.age_check_numbers() from public, anon, authenticated;

/**
 * cases_by_tier: the moderation cases of the last days, by tier, and how many met the time limit.
 * Input: window_days, how far back to count cases by when they arrived.
 * Returns: a JSON list, one entry per tier from the most urgent: {tier, hours, cases, measured,
 *   in_time}. A case is measured once it is decided or its deadline has passed while it is still
 *   open; it is in time when it was decided by its deadline. An open case still inside its time
 *   limit isn't measured yet.
 * Internal: admin_metrics_overview().
 */
create or replace function public.cases_by_tier(window_days integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select cases.tier,
      cases.status = 'decided' and cases.decided_at <= cases.deadline_at as in_time,
      cases.status = 'decided' or cases.deadline_at < now() as measured
    from public.cases
    where cases.received_at >= now() - make_interval(days => window_days)
  )
  select jsonb_agg(jsonb_build_object(
      'tier', tiers.tier,
      'hours', public.tier_hours(tiers.tier),
      'cases', (select count(*) from recent where recent.tier = tiers.tier),
      'measured', (select count(*) from recent where recent.tier = tiers.tier and recent.measured),
      'in_time', (select count(*) from recent where recent.tier = tiers.tier and recent.in_time))
    order by public.tier_rank(tiers.tier))
  from unnest(enum_range(null::public.case_tier)) as tiers (tier);
$$;
comment on function public.cases_by_tier(integer) is
  'Internal: recent moderation cases by tier with the share handled within the time limit (S1-E11-04).';
revoke execute on function public.cases_by_tier(integer) from public, anon, authenticated;

/**
 * admin_metrics_overview: the extra sections of the staff Metrics page (board AdminMetrics).
 * Returns: JSON {sign_ups_by_age, age_checks, cases_by_tier, tier_window_days}, counted now.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is the owner or an admin in a
 *   staff session (may_see_march_numbers(), architecture 1.8.3).
 * Where it fits: /staff/metrics → useMetricsOverview → api/metricsOverview.ts → here.
 */
create or replace function public.admin_metrics_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  window_days integer := coalesce(public.setting_value('tier_numbers_days') #>> '{}', '30')::integer;
begin
  -- Step 1: owner and admins only, like the March numbers.
  if not public.may_see_march_numbers() then
    raise exception 'Only the owner and admins can see these numbers.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the three groups of totals.
  return jsonb_build_object(
    'sign_ups_by_age', public.sign_ups_by_age_group(),
    'age_checks', public.age_check_numbers(),
    'cases_by_tier', public.cases_by_tier(window_days),
    'tier_window_days', window_days);
end;
$$;
comment on function public.admin_metrics_overview() is
  'The staff Metrics page: sign-ups by age group, age checks and cases by tier, totals only (S1-E11-04).';
revoke execute on function public.admin_metrics_overview() from public, anon;
grant execute on function public.admin_metrics_overview() to authenticated;

/* ---------- The compliance log ---------- */

create type public.compliance_entry_kind as enum ('authority_order', 'legal_request', 'launch_notice');
comment on type public.compliance_entry_kind is
  'What a compliance log entry records: an authority order, another legal request, or the ANCOM launch notice (S1-E11-04).';

create sequence public.compliance_log_reference_seq;

create table public.compliance_log_entries (
  id uuid primary key default gen_random_uuid(),
  -- The reference staff quote in letters to the authority: LR-001, LR-002 and so on.
  reference text not null unique
    default 'LR-' || lpad(nextval('public.compliance_log_reference_seq')::text, 3, '0'),
  -- The staff member who logged it (CLAUDE.md rule 15: the owner column of a staff action).
  user_id uuid not null references public.profiles (id),
  entry_kind public.compliance_entry_kind not null,
  -- Who sent it, or for the launch notice whom it went to: "ANCOM", "Police, Prahova county".
  authority text not null,
  received_at timestamptz not null,
  -- What was asked or ordered, in staff's words. An account is named by its username, never more.
  content text not null,
  -- What we did; set when the entry is done.
  action_taken text,
  completed_at timestamptz,
  completed_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_log_entries_authority_length check (char_length(btrim(authority)) between 1 and 200),
  constraint compliance_log_entries_content_length check (char_length(btrim(content)) between 1 and 2000),
  constraint compliance_log_entries_action_length check (action_taken is null or char_length(btrim(action_taken)) between 1 and 2000),
  -- A done entry says what was done, when and by whom.
  constraint compliance_log_entries_done_fields_go_together check (
    (completed_at is null) = (action_taken is null) and (completed_at is null) = (completed_by_user_id is null)),
  constraint compliance_log_entries_done_after_received check (completed_at is null or completed_at >= received_at)
);

comment on table public.compliance_log_entries is
  'kind: staff
Authority orders, legal requests and the ANCOM launch notice logged by staff, with the authority, date, content, action taken and times; user_id is who logged it (S1-E11-04).';
comment on column public.compliance_log_entries.user_id is 'The staff member who logged the entry; never shown publicly (rule 15).';

create index compliance_log_entries_received_at_idx on public.compliance_log_entries (received_at desc);

create trigger compliance_log_entries_set_updated_at
  before update on public.compliance_log_entries
  for each row execute function public.set_updated_at();
create trigger compliance_log_entries_refuse_user_id_change
  before update on public.compliance_log_entries
  for each row execute function public.refuse_user_id_change();

alter table public.compliance_log_entries enable row level security;

-- Who: the owner and admins in a staff session (area compliance_log). Why: the log is proof for
-- authorities and may name an account; nobody else needs it. Writes go only through the admin_*
-- functions below, which write the audit log in the same transaction.
create policy compliance_log_entries_select_staff on public.compliance_log_entries
  for select to authenticated
  using ((select public.staff_may('compliance_log', 'view')));
comment on policy compliance_log_entries_select_staff on public.compliance_log_entries is
  'Allows the owner and admins, in a staff session, to read the compliance log (S1-E11-04).';

grant select on public.compliance_log_entries to authenticated;

/**
 * require_compliance_staff: refuses anyone who may not use the compliance log. Internal.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is owner or admin in a staff
 *   session.
 */
create or replace function public.require_compliance_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('compliance_log', 'act') then
    raise exception 'Only the owner and admins can use the compliance log.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
end;
$$;
comment on function public.require_compliance_staff() is
  'Internal: refuses anyone who may not use the compliance log (S1-E11-04).';
revoke execute on function public.require_compliance_staff() from public, anon, authenticated;

/**
 * compliance_times_problem: checks the times staff give for an entry. Internal.
 * Inputs: received, completed (null while not done). Returns: a reason word, or null when fine:
 *   'in_future' when either is more than five minutes ahead of now (a typo, not a real time),
 *   'done_before_received' when the entry would be done before it arrived.
 */
create or replace function public.compliance_times_problem(received timestamptz, completed timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when received > now() + interval '5 minutes' or completed > now() + interval '5 minutes' then 'in_future'
    when completed < received then 'done_before_received'
  end;
$$;
comment on function public.compliance_times_problem(timestamptz, timestamptz) is
  'Internal: a reason word when compliance log times are impossible, or null (S1-E11-04).';
revoke execute on function public.compliance_times_problem(timestamptz, timestamptz) from public, anon, authenticated;

/**
 * admin_log_compliance_entry: logs an authority order, a legal request or the launch notice
 * (criterion 2).
 * Inputs: kind; authority; received (when it arrived, or for the launch notice when it was sent);
 *   what_was_asked; action (what we did, or null while it is open); done_at (null while open).
 * Returns: the new entry's reference, for example LR-003.
 * Errors: insufficient_privilege; check_violation with a hint ('empty', 'too_long', 'in_future',
 *   'done_before_received', 'action_needs_time') when a field can't be saved.
 * Logged as compliance_log.entry_logged with the entry as after values.
 */
create or replace function public.admin_log_compliance_entry(
  kind public.compliance_entry_kind,
  authority text,
  received timestamptz,
  what_was_asked text,
  action text default null,
  done_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  problem text := public.compliance_times_problem(received, done_at);
  saved public.compliance_log_entries;
begin
  perform public.require_compliance_staff();
  -- Step 1: the fields a record of proof needs, with plain reasons the form can show.
  if received is null or nullif(btrim(authority), '') is null or nullif(btrim(what_was_asked), '') is null then
    problem := 'empty';
  elsif char_length(btrim(authority)) > 200 or char_length(btrim(what_was_asked)) > 2000
        or char_length(coalesce(btrim(action), '')) > 2000 then
    problem := 'too_long';
  elsif (nullif(btrim(action), '') is null) <> (done_at is null) then
    problem := 'action_needs_time';
  end if;
  if problem is not null then
    raise exception 'This entry can''t be saved (%).', problem using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 2: the entry, and its line in the audit log.
  insert into public.compliance_log_entries (user_id, entry_kind, authority, received_at, content,
    action_taken, completed_at, completed_by_user_id)
  values ((select auth.uid()), kind, btrim(authority), received, btrim(what_was_asked),
    nullif(btrim(action), ''), done_at, case when done_at is not null then (select auth.uid()) end)
  returning * into saved;
  perform public.log_staff_action('compliance_log.entry_logged', 'compliance_log_entries', saved.id::text,
    null, null, null, to_jsonb(saved) - 'user_id' - 'completed_by_user_id');
  return saved.reference;
end;
$$;
comment on function public.admin_log_compliance_entry(public.compliance_entry_kind, text, timestamptz, text, text, timestamptz) is
  'Logs an authority order, legal request or launch notice; owner and admin only; audited (S1-E11-04).';
revoke execute on function public.admin_log_compliance_entry(public.compliance_entry_kind, text, timestamptz, text, text, timestamptz) from public, anon;
grant execute on function public.admin_log_compliance_entry(public.compliance_entry_kind, text, timestamptz, text, text, timestamptz) to authenticated;

/**
 * admin_complete_compliance_entry: records what was done about an open entry, and when.
 * Inputs: entry_reference, for example LR-002; action, what we did; done_at, when (now when null).
 * Returns: the time it was done.
 * Errors: insufficient_privilege; no_data_found for an unknown reference; check_violation with the
 *   hint 'already_done' (a done entry is proof and can't be changed), 'empty', 'too_long',
 *   'in_future' or 'done_before_received'.
 * Logged as compliance_log.entry_completed with the before and after values.
 */
create or replace function public.admin_complete_compliance_entry(
  entry_reference text,
  action text,
  done_at timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.compliance_log_entries;
  finished_at timestamptz := coalesce(done_at, now());
  problem text;
begin
  perform public.require_compliance_staff();
  -- Step 1: the entry, locked for the change.
  select * into entry from public.compliance_log_entries where reference = entry_reference for update;
  if entry.id is null then
    raise exception 'There is no compliance log entry %.', entry_reference using errcode = 'no_data_found';
  end if;
  -- Step 2: only an open entry can be finished, with an action and a possible time.
  problem := case
    when entry.completed_at is not null then 'already_done'
    when nullif(btrim(action), '') is null then 'empty'
    when char_length(btrim(action)) > 2000 then 'too_long'
    else public.compliance_times_problem(entry.received_at, finished_at)
  end;
  if problem is not null then
    raise exception 'This entry can''t be finished (%).', problem using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 3: the change and its log line.
  update public.compliance_log_entries
  set action_taken = btrim(action), completed_at = finished_at, completed_by_user_id = (select auth.uid())
  where id = entry.id;
  perform public.log_staff_action('compliance_log.entry_completed', 'compliance_log_entries', entry.id::text,
    null, null, jsonb_build_object('action_taken', null, 'completed_at', null),
    jsonb_build_object('action_taken', btrim(action), 'completed_at', finished_at));
  return finished_at;
end;
$$;
comment on function public.admin_complete_compliance_entry(text, text, timestamptz) is
  'Records the action and time on an open compliance log entry; done entries are locked; audited (S1-E11-04).';
revoke execute on function public.admin_complete_compliance_entry(text, text, timestamptz) from public, anon;
grant execute on function public.admin_complete_compliance_entry(text, text, timestamptz) to authenticated;

/**
 * admin_set_launch_date: sets or clears the public launch date the ANCOM notice is due from.
 * Input: new_date, or null to clear it. Returns: the date, or null.
 * Errors: insufficient_privilege. Logged as settings.value with the before and after values, like
 *   every other setting change (S1-E11-03).
 */
create or replace function public.admin_set_launch_date(new_date date)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_value jsonb := public.setting_value('launch_date');
  new_value jsonb := to_jsonb(coalesce(new_date::text, ''));
begin
  perform public.require_compliance_staff();
  update public.settings set value = new_value where key = 'launch_date';
  perform public.log_staff_action('settings.value', 'settings', 'launch_date', null, null,
    jsonb_build_object('value', old_value), jsonb_build_object('value', new_value));
  return new_date;
end;
$$;
comment on function public.admin_set_launch_date(date) is
  'Sets or clears the launch date the ANCOM notice is due from; owner and admin only; audited (S1-E11-04).';
revoke execute on function public.admin_set_launch_date(date) from public, anon;
grant execute on function public.admin_set_launch_date(date) to authenticated;

/**
 * removal_order_log_rows: the removal orders from the public form, as compliance log rows.
 * Returns: JSON objects {reference, source 'removal_order', kind 'authority_order', authority,
 *   received_at, content (the order's reference and the address it names), decision (the case's
 *   moderation action, or null), completed_at (when the item came down, or the decision)}.
 * Internal: admin_compliance_log().
 */
create or replace function public.removal_order_log_rows()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', notices.reference,
    'source', 'removal_order',
    'kind', 'authority_order',
    'authority', notices.authority_name,
    'received_at', notices.received_at,
    'content', concat_ws(' · ', notices.order_reference, notices.content_url),
    'action_taken', null,
    'decision', cases.decision,
    'completed_at', coalesce(cases.disabled_at, cases.decided_at))
  from public.public_notices as notices
  left join public.cases on cases.id = notices.case_id
  where notices.kind = 'removal_order';
$$;
comment on function public.removal_order_log_rows() is
  'Internal: removal orders from the public form as compliance log rows (S1-E11-04).';
revoke execute on function public.removal_order_log_rows() from public, anon, authenticated;

/**
 * launch_task: the ANCOM launch notice (Law 50/2024: within 45 days of launch).
 * Returns: JSON {launch_date (or null), due_on (or null), notice_reference and notice_done_at (the
 *   first done launch notice in the log, or null)}.
 * Internal: admin_compliance_log().
 */
create or replace function public.launch_task()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with launch as (
    select nullif(public.setting_value('launch_date') #>> '{}', '')::date as launch_date,
      coalesce(public.setting_value('ancom_notice_days') #>> '{}', '45')::integer as notice_days
  ), notice as (
    select reference, completed_at from public.compliance_log_entries
    where entry_kind = 'launch_notice' and completed_at is not null
    order by completed_at limit 1
  )
  select jsonb_build_object(
    'launch_date', launch.launch_date,
    'due_on', launch.launch_date + launch.notice_days,
    'notice_reference', (select reference from notice),
    'notice_done_at', (select completed_at from notice))
  from launch;
$$;
comment on function public.launch_task() is 'Internal: the ANCOM launch notice task (S1-E11-04; Law 50/2024).';
revoke execute on function public.launch_task() from public, anon, authenticated;

/**
 * admin_compliance_log: the compliance log for the Metrics page, or for its CSV export.
 * Input: for_export; true when the person downloads the log, which is written to the audit log as
 *   a sensitive read (architecture 1.8.3).
 * Returns: JSON {entries: [{reference, source ('log' or 'removal_order'), kind, authority,
 *   received_at, content, action_taken, decision, completed_at}] newest first, launch: launch_task()}.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is owner or admin.
 */
create or replace function public.admin_compliance_log(for_export boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entries jsonb;
begin
  perform public.require_compliance_staff();
  -- Step 1: the logged entries and the removal orders, newest first.
  select coalesce(jsonb_agg(row_value order by (row_value ->> 'received_at')::timestamptz desc), '[]'::jsonb)
  into entries
  from (
    select jsonb_build_object('reference', reference, 'source', 'log', 'kind', entry_kind,
      'authority', authority, 'received_at', received_at, 'content', content,
      'action_taken', action_taken, 'decision', null, 'completed_at', completed_at) as row_value
    from public.compliance_log_entries
    union all
    select public.removal_order_log_rows()
  ) as rows;
  -- Step 2: a download is a sensitive read, so it goes in the audit log.
  if for_export then
    perform public.log_staff_action('compliance_log.exported', 'compliance_log_entries', null, null, null,
      null, jsonb_build_object('rows', jsonb_array_length(entries)));
  end if;
  return jsonb_build_object('entries', entries, 'launch', public.launch_task());
end;
$$;
comment on function public.admin_compliance_log(boolean) is
  'The compliance log with removal orders and the launch task; owner and admin only; exports audited (S1-E11-04).';
revoke execute on function public.admin_compliance_log(boolean) from public, anon;
grant execute on function public.admin_compliance_log(boolean) to authenticated;
