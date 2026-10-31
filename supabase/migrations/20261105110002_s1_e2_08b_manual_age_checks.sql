/*
 * Migration: manual age checks, the invitation at 18 and the 14-day clean-up (story S1-E2-08,
 * part 08b; docs/stories/s1-e02-accounts-age-gate-and-onboarding.md; bundle ACCOUNTS-2, part b;
 * ADR 0010).
 *
 * What it adds:
 * - age_check_attempts: one row per finished Yoti check (the line, passed or failed, the method,
 *   when). It is the "attempt history" staff see for a manual check (criterion 8); never a
 *   picture, a document or an estimated age. Kept 6 months, like Yoti's own results.
 * - manual_age_checks: a person's request for a manual check after a failed check (criterion 7),
 *   and the staff decision with its reason. Who decided is in the audit log only, so a member
 *   never sees a staff member's ID. How staff verify an age by hand is OPEN (story S1-E2-08), so
 *   this only records the decision.
 * - request_manual_age_check(): the person's own request; my_age_check() now also says whether
 *   one can be asked and what the latest one says.
 * - admin_manual_age_checks() and admin_decide_manual_age_check(): the staff queue and decision
 *   (owner, admin and moderator: staff_may('users')). The queue shows the year of birth, the one
 *   place staff see it (architecture 1.8.3, decided 17 Oct 2026, 12:34); each account shown is
 *   logged as a sensitive read.
 * - invite_new_adults_to_age_check(): daily; someone whose year now says 18 or over and who holds
 *   only "13 or over" is invited once to take an "18 or over" check (criterion 10). Under-18
 *   protections stay on until that result is stored.
 * - erase_unchecked_accounts(): daily; an account still waiting for a check 14 days after sign-up,
 *   with no open manual check, loses its personal data (criterion 12; canvas 2.3). Rows that other
 *   tables keep for the account go with account deletion (S1-E13-05). Seed personas are left alone.
 * - profiles.birth_year may now be empty, but only on a deleted profile.
 * - age_check_numbers(): "Appealed" on the metrics page counts manual checks (S1-E11-04).
 * Personal data: the attempt history (6 months) and the manual check requests (with the account).
 * Who calls it: src/features/age-check/, src/features/staff/ and pg_cron.
 * Tests: supabase/tests/database/200-manual-age-checks.test.sql.
 */

/* ---------- The year of birth goes with a deleted account ---------- */

alter table public.profiles alter column birth_year drop not null;
alter table public.profiles
  add constraint profiles_birth_year_while_live check (birth_year is not null or deleted_at is not null);

comment on column public.profiles.birth_year is
  'Year of birth from sign-up; never changes. Empty only once the account is deleted (S1-E2-02, S1-E2-08).';

/**
 * refuse_birth_year_change: as in S1-E2-12, the year of birth set at sign-up never changes, with
 * one exception: it is erased when the account is deleted (S1-E2-08 criterion 12).
 * Inputs: the old and new profile rows. Returns: the new row, unchanged.
 * Errors: check_violation (hint birth_year_fixed) for any other change.
 */
create or replace function public.refuse_birth_year_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Erasing the year together with the deletion is the only change allowed.
  if new.birth_year is null and new.deleted_at is not null then
    return new;
  end if;
  if new.birth_year is distinct from old.birth_year then
    raise exception 'The year of birth set at sign-up can''t be changed.'
      using errcode = 'check_violation', hint = 'birth_year_fixed';
  end if;
  return new;
end;
$$;

/* ---------- The attempt history ---------- */

create table public.age_check_attempts (
  id uuid primary key default gen_random_uuid(),
  -- The person who took the check (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The age line the check tested: 13 or 18.
  threshold smallint not null,
  outcome text not null,
  method public.age_check_method not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint age_check_attempts_threshold_known check (threshold in (13, 18)),
  constraint age_check_attempts_outcome_known check (outcome in ('passed', 'failed')),
  -- A manual check is a staff decision, recorded in manual_age_checks, never an attempt.
  constraint age_check_attempts_method_from_yoti check (method <> 'manual')
);

comment on table public.age_check_attempts is
  'kind: user_action
One finished Yoti age check: the line, passed or failed, the method and when (S1-E2-08b). The attempt history staff see for a manual check; kept 6 months.';
comment on column public.age_check_attempts.user_id is
  'The person who took the check; never shown publicly (rule 15).';

create index age_check_attempts_user_id_created_at on public.age_check_attempts (user_id, created_at desc);

create trigger age_check_attempts_set_updated_at
  before update on public.age_check_attempts
  for each row execute function public.set_updated_at();

create trigger age_check_attempts_refuse_user_id_change
  before update on public.age_check_attempts
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.age_check_attempts enable row level security;

-- The person reads their own history; only record_age_check_result() writes it.
grant select on public.age_check_attempts to authenticated;

/**
 * age_check_attempts_select_own: the person reads their own attempt history (data access, GDPR
 * art. 15). Staff read it only through admin_manual_age_checks().
 */
create policy age_check_attempts_select_own
  on public.age_check_attempts for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy age_check_attempts_select_own on public.age_check_attempts is
  'Allows a person to read their own age check attempts (S1-E2-08b).';

/* ---------- Manual check requests ---------- */

create table public.manual_age_checks (
  id uuid primary key default gen_random_uuid(),
  -- The person asking (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- open, then passed_13, passed_18 or refused.
  status text not null default 'open',
  -- Staff's reason, which the person reads with the outcome.
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_age_checks_status_known check (
    status in ('open', 'passed_13', 'passed_18', 'refused')
  ),
  constraint manual_age_checks_decided_together check (
    (status = 'open') = (decided_at is null) and (status = 'open') = (decision_reason is null)
  ),
  constraint manual_age_checks_reason_length check (
    decision_reason is null or char_length(decision_reason) between 1 and 1000
  )
);

comment on table public.manual_age_checks is
  'kind: user_action
A request for a manual age check after a failed Yoti check, and the staff decision (S1-E2-08b). Who decided is in the audit log only.';
comment on column public.manual_age_checks.user_id is
  'The person asking; never shown publicly (rule 15).';

-- One open request per person.
create unique index manual_age_checks_one_open on public.manual_age_checks (user_id) where status = 'open';
create index manual_age_checks_open_by_age on public.manual_age_checks (created_at) where status = 'open';

create trigger manual_age_checks_set_updated_at
  before update on public.manual_age_checks
  for each row execute function public.set_updated_at();

create trigger manual_age_checks_refuse_user_id_change
  before update on public.manual_age_checks
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.manual_age_checks enable row level security;

-- The person reads their own requests; every write goes through the functions below.
grant select on public.manual_age_checks to authenticated;

/**
 * manual_age_checks_select_own: the person reads their own requests and their outcomes, so the
 * age check page can say "A person is checking" or what they decided.
 */
create policy manual_age_checks_select_own
  on public.manual_age_checks for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy manual_age_checks_select_own on public.manual_age_checks is
  'Allows a person to read their own manual age check requests and outcomes (S1-E2-08b).';

/* ---------- Recording each attempt ---------- */

/**
 * record_age_check_result: as in part 08a (stores only the result, its date and its method and
 * forgets the session), and now also adds the attempt to age_check_attempts (criterion 8).
 * Inputs: Yoti's session ID, 'passed' or 'failed', the method and the signature: HMAC-SHA256 of
 *   'result|<session ID>|<outcome>|<method>' with the Vault secret age_check_secret.
 * Returns: { outcome: 'ok', result } or { outcome: 'not_found' } for an unknown or expired session.
 * Errors: insufficient_privilege when the signature doesn't match; check_violation (hint
 *   unknown_outcome or unknown_method).
 */
create or replace function public.record_age_check_result(
  yoti_session_id text,
  outcome text,
  method public.age_check_method,
  signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.age_check_sessions;
  stored public.age_check_result;
begin
  -- Step 1: only our server's signed payload counts.
  if not public.age_check_is_signed(
       'result|' || record_age_check_result.yoti_session_id || '|' || record_age_check_result.outcome
       || '|' || record_age_check_result.method, signature) then
    raise exception 'Only our server can record an age check.' using errcode = 'insufficient_privilege';
  end if;
  if record_age_check_result.outcome not in ('passed', 'failed') then
    raise exception 'Unknown outcome.' using errcode = 'check_violation', hint = 'unknown_outcome';
  end if;
  -- A manual check is a staff decision, never a Yoti result.
  if record_age_check_result.method = 'manual' then
    raise exception 'Unknown method.' using errcode = 'check_violation', hint = 'unknown_method';
  end if;
  -- Step 2: the session must be open; an expired one is simply forgotten.
  delete from public.age_check_sessions
  where age_check_sessions.yoti_session_id = record_age_check_result.yoti_session_id
  returning * into session_row;
  if not found or session_row.expires_at <= now() then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 3: only the result, its date and its method reach the profile (rule 5).
  update public.profiles
  set age_check_result = public.age_check_result_value(
        session_row.threshold, record_age_check_result.outcome = 'passed', profiles.age_check_result),
      age_checked_at = now(),
      age_check_method = record_age_check_result.method
  where profiles.id = session_row.user_id
  returning age_check_result into stored;
  -- Step 4: the attempt, for the history staff see if the person asks for a manual check.
  insert into public.age_check_attempts (user_id, threshold, outcome, method)
  values (session_row.user_id, session_row.threshold, record_age_check_result.outcome,
    record_age_check_result.method);
  return jsonb_build_object('outcome', 'ok', 'result', stored);
end;
$$;

/* ---------- Asking for a manual check ---------- */

/**
 * age_check_can_ask_manual: whether a profile may ask for a manual check now: its latest attempt
 * failed, it holds no "18 or over" result, and it hasn't asked since that attempt (so each request
 * follows a fresh failed check, and only one is open at a time).
 * Input: the profile row. Returns: true or false. Internal: my_age_check() and
 * request_manual_age_check().
 */
create or replace function public.age_check_can_ask_manual(person public.profiles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select latest.outcome = 'failed'
      and person.age_check_result is distinct from '18_or_over'
      and not exists (
        select 1 from public.manual_age_checks
        where manual_age_checks.user_id = person.id
          and (manual_age_checks.status = 'open' or manual_age_checks.created_at >= latest.created_at))
    from public.age_check_attempts as latest
    where latest.user_id = person.id
    order by latest.created_at desc
    limit 1), false);
$$;

comment on function public.age_check_can_ask_manual(public.profiles) is
  'Internal: whether a profile may ask for a manual age check now (S1-E2-08b).';
revoke execute on function public.age_check_can_ask_manual(public.profiles) from public, anon, authenticated;

/**
 * latest_manual_age_check: a person's latest manual check request, as the age check page shows it.
 * Input: the user ID. Returns: { status, requested_at, decided_at, reason } or null.
 * Internal: my_age_check().
 */
create or replace function public.latest_manual_age_check(target_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', manual_age_checks.status,
    'requested_at', manual_age_checks.created_at,
    'decided_at', manual_age_checks.decided_at,
    'reason', manual_age_checks.decision_reason)
  from public.manual_age_checks
  where manual_age_checks.user_id = target_user_id
  order by manual_age_checks.created_at desc
  limit 1;
$$;

comment on function public.latest_manual_age_check(uuid) is
  'Internal: a person''s latest manual age check request (S1-E2-08b).';
revoke execute on function public.latest_manual_age_check(uuid) from public, anon, authenticated;

/**
 * my_age_check: as in part 08a, plus can_ask_manual (a manual check may be asked now) and
 * manual_check (the latest request: status, requested_at, decided_at, reason; null without one).
 * Returns: { outcome: 'ok', result, checked_at, method, threshold, can_start, is_checking,
 *   needs_check, can_ask_manual, manual_check } or { outcome: 'not_found' }. Never the year.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_age_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  person public.profiles;
  state public.account_status;
begin
  -- Step 1: signed in, with a live profile.
  if (select auth.uid()) is null then
    raise exception 'Sign in to check your age.' using errcode = 'insufficient_privilege';
  end if;
  select * into person from public.profiles
  where profiles.id = (select auth.uid()) and profiles.deleted_at is null;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: what the account state says about the check, and the manual route.
  state := public.account_state(person.id);
  return jsonb_build_object(
    'outcome', 'ok',
    'result', person.age_check_result,
    'checked_at', person.age_checked_at,
    'method', person.age_check_method,
    'threshold', public.age_check_threshold_for(person),
    'can_start', public.age_check_can_start_for(person),
    'is_checking', exists (
      select 1 from public.age_check_sessions
      where age_check_sessions.user_id = person.id and age_check_sessions.expires_at > now()),
    'needs_check', state in ('age_check_pending', 'age_check_failed'),
    'can_ask_manual', public.age_check_can_ask_manual(person),
    'manual_check', public.latest_manual_age_check(person.id));
end;
$$;

/**
 * request_manual_age_check: the person asks for a manual check after a failed check (criterion 7).
 * The account stays read-only meanwhile, and the 14-day clean-up waits while it is open.
 * Returns: { outcome: 'ok' }.
 * Errors: insufficient_privilege when signed out; check_violation (hint not_available) when no
 *   failed check comes first or a request is already open.
 * Flow: "Ask for a manual check" on /age-check and /age-check/return → here → the staff queue.
 */
create or replace function public.request_manual_age_check()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  person public.profiles;
begin
  -- Step 1: signed in, with a live profile.
  if (select auth.uid()) is null then
    raise exception 'Sign in to ask for a manual check.' using errcode = 'insufficient_privilege';
  end if;
  select * into person from public.profiles
  where profiles.id = (select auth.uid()) and profiles.deleted_at is null
  for update;
  -- Step 2: only after a failed check, and one request at a time.
  if not found or not public.age_check_can_ask_manual(person) then
    raise exception 'A manual check can be asked after a check that didn''t work.'
      using errcode = 'check_violation', hint = 'not_available';
  end if;
  insert into public.manual_age_checks (user_id) values (person.id);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.request_manual_age_check() is
  'A person asks for a manual age check after a failed Yoti check (S1-E2-08b).';
revoke execute on function public.request_manual_age_check() from public, anon;
grant execute on function public.request_manual_age_check() to authenticated;

/* ---------- Staff: the queue and the decision ---------- */

/**
 * working_days_after: the date a number of working days (Monday to Friday) after a moment, in
 * Romania time. Public holidays aren't counted out yet. Canvas 2.3: a person replies within 5
 * working days.
 * Inputs: the moment and how many working days. Returns: the date. Internal.
 */
create or replace function public.working_days_after(start_moment timestamptz, day_count integer)
returns date
language sql
stable
set search_path = ''
as $$
  select days.day::date
  from generate_series(
    (start_moment at time zone 'Europe/Bucharest')::date + 1,
    (start_moment at time zone 'Europe/Bucharest')::date + day_count * 2 + 7,
    interval '1 day') as days (day)
  where extract(isodow from days.day) < 6
  order by days.day
  offset greatest(day_count - 1, 0)
  limit 1;
$$;

comment on function public.working_days_after(timestamptz, integer) is
  'Internal: the date some working days (Monday to Friday) after a moment, Romania time (S1-E2-08b).';
revoke execute on function public.working_days_after(timestamptz, integer) from public, anon, authenticated;

/**
 * admin_manual_age_checks: the open manual age checks, oldest first (screen 8.5's manual checks
 * panel; criterion 8).
 * Returns: per request: request_id, handle, birth_year and birth_month (the named exception in
 *   architecture 1.8.3), age_band from them, the current result, requested_at, answer_by (5
 *   working days) and attempts (JSON: threshold, outcome, method, at; newest first). Never a
 *   picture, a document, an estimated age or the user ID.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may act on Users (owner,
 *   admin, moderator) in a staff session.
 * Logging: each account shown is a sensitive read (its year of birth), with its user ID.
 * Where it fits: /staff/users/age-checks → useManualAgeChecks → api/manualAgeChecks.ts → here.
 */
create or replace function public.admin_manual_age_checks()
returns table (
  request_id uuid,
  handle text,
  birth_year integer,
  birth_month integer,
  age_band public.age_band,
  age_check_result public.age_check_result,
  requested_at timestamptz,
  answer_by date,
  attempts jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request record;
begin
  -- Step 1: owner, admin or moderator, in a staff session (architecture 1.8.3).
  if not public.staff_may('users', 'act') then
    raise exception 'Only staff who handle accounts may see manual age checks.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: each open request with what staff need to decide, nothing more.
  for request in
    select manual_age_checks.id, manual_age_checks.user_id, manual_age_checks.created_at,
      profiles.handle, profiles.birth_year, profiles.birth_month, profiles.age_check_result
    from public.manual_age_checks
    join public.profiles on profiles.id = manual_age_checks.user_id and profiles.deleted_at is null
    where manual_age_checks.status = 'open'
    order by manual_age_checks.created_at
  loop
    -- Seeing the year of birth is a sensitive read, logged per account.
    perform public.log_staff_action('sensitive_read.manual_age_check', 'manual_age_checks',
      request.id::text, request.user_id);
    request_id := request.id;
    handle := request.handle;
    birth_year := request.birth_year;
    birth_month := request.birth_month;
    age_band := public.age_band_from_birth(request.birth_year, request.birth_month, 'pending',
      (now() at time zone 'Europe/Bucharest')::date);
    age_check_result := request.age_check_result;
    requested_at := request.created_at;
    answer_by := public.working_days_after(request.created_at, 5);
    attempts := public.age_check_attempt_history(request.user_id);
    return next;
  end loop;
end;
$$;

/**
 * age_check_attempt_history: a person's attempts, newest first, for the staff queue.
 * Input: the user ID. Returns: JSON array of { threshold, outcome, method, at }. Internal.
 */
create or replace function public.age_check_attempt_history(target_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'threshold', attempts.threshold, 'outcome', attempts.outcome,
      'method', attempts.method, 'at', attempts.created_at)
    order by attempts.created_at desc), '[]'::jsonb)
  from public.age_check_attempts as attempts
  where attempts.user_id = target_user_id;
$$;

comment on function public.age_check_attempt_history(uuid) is
  'Internal: a person''s age check attempts for the staff queue (S1-E2-08b).';
revoke execute on function public.age_check_attempt_history(uuid) from public, anon, authenticated;

comment on function public.admin_manual_age_checks() is
  'Staff: the open manual age checks with the year of birth and attempt history; each read logged (S1-E2-08b).';
revoke execute on function public.admin_manual_age_checks() from public, anon;
grant execute on function public.admin_manual_age_checks() to authenticated;

/**
 * manual_decision_result: the result a manual decision stores. A pass never lowers an earlier
 * "18 or over"; a refusal keeps whatever the person holds. Internal.
 * Inputs: the decision and the current result. Returns: the result to store.
 */
create or replace function public.manual_decision_result(
  decision text,
  current_result public.age_check_result
)
returns public.age_check_result
language sql
immutable
set search_path = ''
as $$
  select case
    when decision = 'refused' then current_result
    when decision = 'passed_18' or current_result = '18_or_over' then '18_or_over'::public.age_check_result
    else '13_or_over'::public.age_check_result
  end;
$$;

comment on function public.manual_decision_result(text, public.age_check_result) is
  'Internal: the age check result a manual decision stores (S1-E2-08b).';
revoke execute on function public.manual_decision_result(text, public.age_check_result)
  from public, anon, authenticated;

/**
 * admin_decide_manual_age_check: records a staff decision on one open manual check (criterion 8).
 * Inputs: the request, the decision ('passed_13', 'passed_18' or 'refused') and the reason the
 *   person will read. How staff verify is OPEN (story S1-E2-08); this records only the outcome.
 * Returns: { outcome: 'ok', result }: the result now stored on the profile.
 * Errors: insufficient_privilege (hint not_allowed) unless owner, admin or moderator in a staff
 *   session; check_violation (hint unknown_decision, reason_needed or not_open).
 * Effects: a pass stores the result with method 'manual' and today's date; the audit log gets the
 *   decision, the reason and the result before and after; the person is notified
 *   (age_check_decided), with no staff name.
 */
create or replace function public.admin_decide_manual_age_check(
  request_id uuid,
  decision text,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.manual_age_checks;
  before_result public.age_check_result;
  after_result public.age_check_result;
  clean_reason text := btrim(coalesce(reason, ''));
begin
  -- Step 1: who may decide, and a decision with a reason (canvas 2.3).
  if not public.staff_may('users', 'act') then
    raise exception 'Only staff who handle accounts may decide manual age checks.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  if decision is null or decision not in ('passed_13', 'passed_18', 'refused') then
    raise exception 'Unknown decision.' using errcode = 'check_violation', hint = 'unknown_decision';
  end if;
  if char_length(clean_reason) not between 1 and 1000 then
    raise exception 'Write a reason (up to 1,000 characters).'
      using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 2: the request must still be open.
  select * into request from public.manual_age_checks
  where manual_age_checks.id = request_id and manual_age_checks.status = 'open'
  for update;
  if not found then
    raise exception 'This manual check is already decided.' using errcode = 'check_violation', hint = 'not_open';
  end if;
  -- Step 3: the decision on the request, and the result on the profile.
  update public.manual_age_checks
  set status = decision, decision_reason = clean_reason, decided_at = now()
  where manual_age_checks.id = request.id;
  select age_check_result into before_result from public.profiles where profiles.id = request.user_id;
  after_result := public.manual_decision_result(decision, before_result);
  if decision <> 'refused' then
    update public.profiles
    set age_check_result = after_result, age_checked_at = now(), age_check_method = 'manual'
    where profiles.id = request.user_id;
  end if;
  -- Step 4: the audit log and the person's notification.
  perform public.log_staff_action('manual_age_check.decided', 'manual_age_checks', request.id::text,
    request.user_id, clean_reason, jsonb_build_object('age_check_result', before_result),
    jsonb_build_object('age_check_result', after_result, 'decision', decision));
  perform public.notify(request.user_id, 'age_check_decided', null, '{}'::jsonb);
  return jsonb_build_object('outcome', 'ok', 'result', after_result);
end;
$$;

comment on function public.admin_decide_manual_age_check(uuid, text, text) is
  'Staff: decides one manual age check with a reason; logged and the person told (S1-E2-08b).';
revoke execute on function public.admin_decide_manual_age_check(uuid, text, text) from public, anon;
grant execute on function public.admin_decide_manual_age_check(uuid, text, text) to authenticated;

/* ---------- Notifications ---------- */

/**
 * notification_category: as in CMS-1e, with the two age check kinds under the moderation team's
 * chip ("staff"): both come from us, not from another member (S1-E2-08b).
 * Input: the kind. Returns: 'stories', 'follows', 'staff' or 'replies'. Internal: my_notifications().
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    else 'replies'
  end;
$$;

/* ---------- Daily jobs ---------- */

/**
 * invite_new_adults_to_age_check: invites, once, everyone whose year (and month) of birth now says
 * 18 or over but who holds only "13 or over", to take an "18 or over" check (criterion 10). Until
 * they do, age_band() keeps under-18 protections on.
 * Returns: how many were invited. Runs daily (job invite-new-adults-to-age-check).
 */
create or replace function public.invite_new_adults_to_age_check()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  person record;
  invited integer := 0;
  today date := (now() at time zone 'Europe/Bucharest')::date;
begin
  for person in
    select profiles.id from public.profiles
    where profiles.deleted_at is null
      and profiles.age_check_result = '13_or_over'
      and public.age_band_from_birth(profiles.birth_year, profiles.birth_month, 'pending', today) = '18_plus'
      and not exists (
        select 1 from public.notifications
        where notifications.user_id = profiles.id and notifications.kind = 'age_check_18_invite')
  loop
    perform public.notify(person.id, 'age_check_18_invite', null, '{}'::jsonb);
    invited := invited + 1;
  end loop;
  return invited;
end;
$$;

comment on function public.invite_new_adults_to_age_check() is
  'Daily: invites new adults holding only "13 or over" to an "18 or over" check (S1-E2-08b).';
revoke execute on function public.invite_new_adults_to_age_check() from public, anon, authenticated;

/**
 * erase_unchecked_account: removes one account's personal data because no age check passed within
 * 14 days of sign-up (criterion 12). The profile is marked deleted and loses its year and month
 * of birth, pen name, bio and birthday; the login loses its email, password, identities and
 * sessions and can't sign in again. Rows other tables keep for the account (consents, the audit
 * log) go with account deletion (S1-E13-05).
 * Input: the user ID. Internal: erase_unchecked_accounts().
 */
create or replace function public.erase_unchecked_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the profile: deleted, with its personal details gone.
  update public.profiles
  set deleted_at = now(), birth_year = null, birth_month = null, pen_name = null, bio = '',
      birthday_day = null, birthday_month = null
  where profiles.id = target_user_id;
  -- Step 2: the age check rows that only made sense while the account waited.
  delete from public.age_check_sessions where age_check_sessions.user_id = target_user_id;
  delete from public.age_check_attempts where age_check_attempts.user_id = target_user_id;
  -- Step 3: the login: no email, no password, no way back in.
  delete from auth.refresh_tokens where refresh_tokens.user_id = target_user_id::text;
  delete from auth.sessions where sessions.user_id = target_user_id;
  delete from auth.identities where identities.user_id = target_user_id;
  update auth.users
  set email = target_user_id::text || '@deleted.invalid', encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = now() + interval '100 years'
  where users.id = target_user_id;
end;
$$;

comment on function public.erase_unchecked_account(uuid) is
  'Internal: removes the personal data of an account whose age check never passed (S1-E2-08b).';
revoke execute on function public.erase_unchecked_account(uuid) from public, anon, authenticated;

/**
 * erase_unchecked_accounts: the 14-day clean-up (criterion 12; canvas 2.3). An account still
 * waiting for an age check (account_state() age_check_pending or age_check_failed) 14 days after
 * sign-up, with no open manual check, is erased. While adults_only is on, invited adults are
 * active without a check, so only failed checks are erased. Seed personas are left alone.
 * Returns: how many were erased. Runs daily (job erase-unchecked-accounts).
 */
create or replace function public.erase_unchecked_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  person record;
  erased integer := 0;
begin
  for person in
    select profiles.id from public.profiles
    join auth.users on users.id = profiles.id
    where profiles.deleted_at is null
      and users.created_at <= now() - interval '14 days'
      and coalesce(users.raw_app_meta_data ->> 'seed_persona', 'false') <> 'true'
      and public.account_state(profiles.id) in ('age_check_pending', 'age_check_failed')
      and not exists (
        select 1 from public.manual_age_checks
        where manual_age_checks.user_id = profiles.id and manual_age_checks.status = 'open')
  loop
    perform public.erase_unchecked_account(person.id);
    erased := erased + 1;
  end loop;
  return erased;
end;
$$;

comment on function public.erase_unchecked_accounts() is
  'Daily: erases accounts with no passed age check 14 days after sign-up (S1-E2-08b).';
revoke execute on function public.erase_unchecked_accounts() from public, anon, authenticated;

/**
 * purge_old_age_check_attempts: removes attempts older than 6 months, as long as Yoti keeps its
 * own results (Yoti client terms). Returns: how many were removed. Runs hourly with the session
 * clean-up.
 */
create or replace function public.purge_old_age_check_attempts()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.age_check_attempts
    where age_check_attempts.created_at < now() - interval '6 months'
    returning 1
  )
  select count(*)::integer from removed;
$$;

comment on function public.purge_old_age_check_attempts() is
  'Removes age check attempts older than 6 months (S1-E2-08b).';
revoke execute on function public.purge_old_age_check_attempts() from public, anon, authenticated;

-- Naming each job makes this safe to run again: cron.schedule replaces a job of the same name.
-- 22:15 UTC is just after midnight in Romania, so 1 January's new adults are invited that night.
select cron.schedule(
  'invite-new-adults-to-age-check', '15 22 * * *', 'select public.invite_new_adults_to_age_check()');
select cron.schedule('erase-unchecked-accounts', '45 2 * * *', 'select public.erase_unchecked_accounts()');
select cron.schedule(
  'purge-old-age-check-attempts', '23 3 * * *', 'select public.purge_old_age_check_attempts()');

/* ---------- The metrics page ---------- */

/**
 * age_check_numbers: as in S1-E11-04, with "appealed" now counting manual check requests.
 * Returns: JSON {passed, failed, not_finished, appealed}. Internal: admin_metrics_overview().
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
    'appealed', (select count(*) from public.manual_age_checks))
  from public.profiles
  where deleted_at is null
    and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id);
$$;

comment on function public.age_check_numbers() is
  'Internal: age check results as totals, with manual checks as "appealed" (S1-E2-08b).';
