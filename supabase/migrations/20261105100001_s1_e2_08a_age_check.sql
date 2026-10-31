/*
 * Migration: the age check with Yoti, on the web (story S1-E2-08, part 08a;
 * docs/stories/s1-e02-accounts-age-gate-and-onboarding.md; bundle ACCOUNTS-2, part a; ADR 0010).
 *
 * What it adds:
 * - age_check_sessions: the short-lived link between one Yoti session and the person who started
 *   it (architecture 1.6). It holds Yoti's session ID, the age line checked (13 or 18) and when it expires. The row is deleted as soon as the result
 *   is stored, when the person starts again, or by the hourly clean-up once it has expired, so
 *   nothing from an old session is kept (criterion 11).
 * - my_age_check(): what the age check page needs: the stored result, which line a new check
 *   would test (18 when the year of birth says 18 or over, otherwise 13), whether a check can
 *   start and whether one is waiting for its result.
 * - begin_age_check() and record_age_check_result(): our server's two writes. Both only count a
 *   payload signed with the Vault secret age_check_secret (the same value as AGE_CHECK_SECRET in
 *   Cloudflare), so nobody can mark their own age as checked from the browser. The result stores
 *   only age_check_result, age_checked_at and age_check_method on the profile (criterion 5; CLAUDE.md
 *   rule 5): never a selfie, a document image, an estimated age or Yoti's evidence.
 * - purge_expired_age_check_sessions() and its hourly job.
 * The account gate (account_state(), age_band()) already reads age_check_result, so a stored
 * result changes what the account may do at once: "18 or over" ends under-18 protections and
 * "13 or over" keeps them on whatever the year says (criterion 6).
 * Personal data: Yoti's session ID for up to 30 minutes, tied to the user ID; no image, no age.
 * Who calls it: server/age-check.ts (through /api/age-check) and src/features/age-check/.
 * Tests: supabase/tests/database/199-age-check.test.sql.
 */

/* ---------- The short-lived session link ---------- */

create table public.age_check_sessions (
  id uuid primary key default gen_random_uuid(),
  -- The person checking their age (CLAUDE.md rule 15); one open check at a time.
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  -- Yoti's own session ID, which its notification names.
  yoti_session_id text not null unique,
  -- The age line this session checks: 13 or 18.
  threshold smallint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint age_check_sessions_threshold_known check (threshold in (13, 18)),
  constraint age_check_sessions_yoti_session_id_length check (
    char_length(yoti_session_id) between 1 and 200
  )
);

comment on table public.age_check_sessions is
  'kind: user_action
The short-lived link between one Yoti age check session and the person who started it (S1-E2-08). Deleted once the result is stored, when a new check starts or after it expires.';
comment on column public.age_check_sessions.user_id is
  'The person checking their age; never shown publicly (rule 15).';
comment on column public.age_check_sessions.threshold is
  'The age line this session checks: 18 when the year of birth says 18 or over, otherwise 13.';

create trigger age_check_sessions_set_updated_at
  before update on public.age_check_sessions
  for each row execute function public.set_updated_at();

create trigger age_check_sessions_refuse_user_id_change
  before update on public.age_check_sessions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.age_check_sessions enable row level security;

-- The person reads their own open check; every write goes through the signed functions below.
grant select on public.age_check_sessions to authenticated;

/**
 * age_check_sessions_select_own: the person reads their own open check, so the return page can
 * say "Checking your age" while the result is on its way.
 */
create policy age_check_sessions_select_own
  on public.age_check_sessions for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy age_check_sessions_select_own on public.age_check_sessions is
  'Allows a person to read their own open age check session, so the return page knows a result is on its way (S1-E2-08).';

/* ---------- The signature ---------- */

/**
 * age_check_is_signed: true when the payload was signed by our server with the Vault secret
 * age_check_secret (the same value as AGE_CHECK_SECRET in Cloudflare); always false while the
 * secret isn't set. Internal: begin_age_check() and record_age_check_result().
 */
create or replace function public.age_check_is_signed(payload text, signature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'age_check_secret';
  if secret is null or secret = '' or signature is null then
    return false;
  end if;
  return encode(extensions.hmac(payload, secret, 'sha256'), 'hex') = lower(signature);
end;
$$;

comment on function public.age_check_is_signed(text, text) is
  'Internal: checks an age check payload''s signature against the Vault secret age_check_secret (S1-E2-08).';
revoke execute on function public.age_check_is_signed(text, text) from public, anon, authenticated;

/* ---------- What the page needs ---------- */

/**
 * age_check_threshold_for: the age line a new check tests for one profile: 18 when the year (and
 * month) of birth says 18 or over, otherwise 13 (S1-E2-08 criterion 6).
 * Input: the profile row. Returns: 13 or 18. Internal: my_age_check() and begin_age_check().
 */
create or replace function public.age_check_threshold_for(person public.profiles)
returns smallint
language sql
stable
set search_path = ''
as $$
  select case
    when public.age_band_from_birth(
      person.birth_year, person.birth_month, 'pending',
      (now() at time zone 'Europe/Bucharest')::date) = '18_plus'
    then 18::smallint
    else 13::smallint
  end;
$$;

comment on function public.age_check_threshold_for(public.profiles) is
  'Internal: the age line a new Yoti check tests for a profile, 13 or 18 (S1-E2-08).';
revoke execute on function public.age_check_threshold_for(public.profiles) from public, anon, authenticated;

/**
 * age_check_can_start_for: whether a profile may start a check: it has a year of birth, the year
 * isn't under 13, and the stored result doesn't already cover the line a new check would test.
 * Input: the profile row. Returns: true or false. Internal: my_age_check() and begin_age_check().
 */
create or replace function public.age_check_can_start_for(person public.profiles)
returns boolean
language sql
stable
set search_path = ''
as $$
  select person.birth_year is not null
    and public.age_band_from_birth(
      person.birth_year, person.birth_month, 'pending',
      (now() at time zone 'Europe/Bucharest')::date) <> 'under_13'
    and person.age_check_result is distinct from '18_or_over'
    and not (person.age_check_result = '13_or_over' and public.age_check_threshold_for(person) = 13);
$$;

comment on function public.age_check_can_start_for(public.profiles) is
  'Internal: whether a profile may start a Yoti age check (S1-E2-08).';
revoke execute on function public.age_check_can_start_for(public.profiles) from public, anon, authenticated;

/**
 * my_age_check: the caller's age check, for the age check page, its return page and the notice.
 * Returns: { outcome: 'ok', result, checked_at, method, threshold, can_start, is_checking,
 *   needs_check }, where needs_check is true while the account waits for a check to pass
 *   (account_state() answers age_check_pending or age_check_failed); { outcome: 'not_found' }
 *   without a live profile. Never the year of birth itself.
 * Errors: insufficient_privilege when signed out.
 * Flow: the age check screens (src/features/age-check/) and our server's start step.
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
  -- Step 2: what the account state says about the check.
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
    'needs_check', state in ('age_check_pending', 'age_check_failed'));
end;
$$;

comment on function public.my_age_check() is
  'The caller''s age check: result, method, the line a new check tests and whether one can start (S1-E2-08).';
revoke execute on function public.my_age_check() from public, anon;
grant execute on function public.my_age_check() to authenticated;

/* ---------- Our server's two writes ---------- */

/**
 * begin_age_check: links a new Yoti session to the caller, replacing any older one (criterion 11).
 * Called by our server (/api/age-check/start) with the person's own sign-in, after it created the
 * session at Yoti.
 * Inputs: Yoti's session ID, the line it checks, and the signature: HMAC-SHA256 of
 *   'begin|<session ID>|<threshold>' with AGE_CHECK_SECRET.
 * Returns: { outcome: 'ok' } or { outcome: 'not_needed' } when no check can start.
 * Errors: insufficient_privilege when signed out or the signature doesn't match; check_violation
 *   (hint wrong_threshold) when the line isn't the one my_age_check() gives.
 */
create or replace function public.begin_age_check(
  yoti_session_id text,
  threshold smallint,
  signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  person public.profiles;
begin
  -- Step 1: signed in, and the payload signed by our server.
  if (select auth.uid()) is null
     or not public.age_check_is_signed(
       'begin|' || begin_age_check.yoti_session_id || '|' || begin_age_check.threshold, signature) then
    raise exception 'Only our server can start an age check.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the person may start one, for the line their year of birth gives.
  select * into person from public.profiles
  where profiles.id = (select auth.uid()) and profiles.deleted_at is null;
  if not found or not public.age_check_can_start_for(person) then
    return jsonb_build_object('outcome', 'not_needed');
  end if;
  if begin_age_check.threshold <> public.age_check_threshold_for(person) then
    raise exception 'Wrong age line.' using errcode = 'check_violation', hint = 'wrong_threshold';
  end if;
  -- Step 3: one open check at a time; an older session is forgotten (criterion 11).
  delete from public.age_check_sessions where age_check_sessions.user_id = person.id;
  insert into public.age_check_sessions (user_id, yoti_session_id, threshold, expires_at)
  values (person.id, begin_age_check.yoti_session_id, begin_age_check.threshold, now() + interval '30 minutes');
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.begin_age_check(text, smallint, text) is
  'Our server links a new Yoti age check session to the caller, replacing any older one (S1-E2-08).';
revoke execute on function public.begin_age_check(text, smallint, text) from public, anon;
grant execute on function public.begin_age_check(text, smallint, text) to authenticated;

/**
 * age_check_result_value: the result to store for a finished session, given what is stored now.
 * A pass gives the session's line ("13 or over" or "18 or over"). A failure is stored only while
 * nothing has passed yet, so a person with "13 or over" who fails the 18 check keeps it.
 * Inputs: the session's line, whether it passed, the stored result. Returns: the result to store.
 * Internal: record_age_check_result().
 */
create or replace function public.age_check_result_value(
  threshold smallint,
  passed boolean,
  current_result public.age_check_result
)
returns public.age_check_result
language sql
immutable
set search_path = ''
as $$
  select case
    when passed and threshold = 18 then '18_or_over'::public.age_check_result
    when passed then '13_or_over'::public.age_check_result
    when current_result in ('13_or_over', '18_or_over') then current_result
    else 'failed'::public.age_check_result
  end;
$$;

comment on function public.age_check_result_value(smallint, boolean, public.age_check_result) is
  'Internal: the age check result to store for a finished Yoti session (S1-E2-08).';
revoke execute on function public.age_check_result_value(smallint, boolean, public.age_check_result)
  from public, anon, authenticated;

/**
 * record_age_check_result: stores the result of a finished Yoti session and forgets the session
 * (criterion 5). Called by our server's webhook (/api/age-check/webhook) after it verified Yoti's
 * signature and fetched the result from Yoti; the webhook has no sign-in, so anon may call it, but
 * only a payload signed with AGE_CHECK_SECRET counts.
 * Inputs: Yoti's session ID, 'passed' or 'failed', the method ('facial_estimation' or
 *   'id_document'), and the signature: HMAC-SHA256 of 'result|<session ID>|<outcome>|<method>'.
 * Returns: { outcome: 'ok', result } or { outcome: 'not_found' } for an unknown or expired session.
 * Errors: insufficient_privilege when the signature doesn't match; check_violation (hint
 *   unknown_outcome) for anything but passed or failed, or (hint unknown_method) for manual.
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
  -- A manual check is a staff decision (S1-E2-08b), never a Yoti result.
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
  return jsonb_build_object('outcome', 'ok', 'result', stored);
end;
$$;

comment on function public.record_age_check_result(text, text, public.age_check_method, text) is
  'Our server stores the result of a finished Yoti age check and forgets its session (S1-E2-08).';
revoke execute on function public.record_age_check_result(text, text, public.age_check_method, text) from public;
grant execute on function public.record_age_check_result(text, text, public.age_check_method, text)
  to anon, authenticated;

/* ---------- Clean-up ---------- */

/**
 * purge_expired_age_check_sessions: removes every session past its expiry (criterion 11), so a
 * closed browser or a cancelled check leaves nothing behind.
 * Returns: how many were removed. Runs hourly (job purge-expired-age-check-sessions).
 */
create or replace function public.purge_expired_age_check_sessions()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.age_check_sessions where age_check_sessions.expires_at <= now() returning 1
  )
  select count(*)::integer from removed;
$$;

comment on function public.purge_expired_age_check_sessions() is
  'Removes expired Yoti age check sessions; runs hourly (S1-E2-08).';
revoke execute on function public.purge_expired_age_check_sessions() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule(
  'purge-expired-age-check-sessions', '17 * * * *', 'select public.purge_expired_age_check_sessions()');
