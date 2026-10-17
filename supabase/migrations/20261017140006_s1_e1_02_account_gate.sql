-- Migration: the account gate skeleton (story S1-E1-02; architecture 1.7.8, piece B02).
--
-- What it adds: the functions every write policy and every under-18 protection will call.
--   is_feature_enabled(key)        internal: reads one switch from feature_flags.
--   age_band_from_birth(...)       pure: the age group from a year (and month) on a given date.
--   age_band()                     the signed-in user's age group.
--   account_state(user_id)         internal: why an account can or can't write.
--   is_active_member()             true only when the signed-in user may write.
--   is_staff(role)                 true when the signed-in user holds a staff role.
--   is_staff_session()             true when the session may use staff powers.
-- Who calls them: RLS policies (later stories: publish, comment, post, message), the audit log
-- function (next migration) and the database tests.
-- Skeleton: later stories fill parts in. S1-E2-03 adds the parental consent lookup; S1-E10-06
-- adds suspensions and bans; S1-E2-07a decides the staff role hierarchy; S1-E2-07b changes
-- is_staff_session() to the Google Workspace sign-in.
-- Security: every function runs with an empty search_path and names every schema, so nobody can
-- slip in a look-alike table or function.

/**
 * is_feature_enabled: reads one switch from feature_flags.
 * Input: flag_key, for example 'adults_only'. Returns: true when the flag exists and is on;
 *   false when it is off or missing (a missing flag is treated as off, the safe default).
 * Where it fits: used inside the gate; not callable by clients, so private flags stay private.
 */
create or replace function public.is_feature_enabled(flag_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select feature_flags.is_enabled from public.feature_flags where feature_flags.key = flag_key),
    false
  );
$$;

comment on function public.is_feature_enabled(text) is
  'Internal: true when the named feature flag is on; a missing flag counts as off (S1-E1-02).';

/**
 * age_band_from_birth: the age group of someone born in birth_year (and birth_month) on on_date.
 * Rules (S1-E2-02, decided 16 Oct 2026, Q16):
 *   - Year only: use the younger possible age, as if the birthday were 31 December. So the 18
 *     line changes on 1 January of the year after the person turns 18 by year.
 *   - Year and month: the person reaches a new age on the first day of the month after their
 *     birthday month (someone born in May 2011 counts as 15 until 1 June 2027).
 *   - A '13_or_over' age check result caps the group below 18: under-18 protections stay on
 *     until an '18_or_over' result is stored (S1-E2-08).
 * Inputs: birth_year, birth_month (null when not asked), check_result, on_date.
 * Returns: an age_band; 'unknown' when the year is missing. Errors: none.
 */
create or replace function public.age_band_from_birth(
  birth_year integer,
  birth_month integer,
  check_result public.age_check_result,
  on_date date
)
returns public.age_band
language plpgsql
immutable
set search_path = ''
as $$
declare
  youngest_possible_age integer;
  band public.age_band;
begin
  -- Without a year there is nothing to work from.
  if birth_year is null then
    return 'unknown';
  end if;

  -- Work out the youngest age the person can be on on_date.
  youngest_possible_age := extract(year from on_date)::integer - birth_year;
  if birth_month is null or extract(month from on_date)::integer <= birth_month then
    youngest_possible_age := youngest_possible_age - 1;
  end if;

  -- Turn the age into a group.
  band := case
    when youngest_possible_age < 13 then 'under_13'
    when youngest_possible_age < 16 then '13_to_15'
    when youngest_possible_age < 18 then '16_to_17'
    else '18_plus'
  end;

  -- A "13 or over" check result keeps under-18 protections on, whatever the year says.
  if band = '18_plus' and check_result = '13_or_over' then
    band := '16_to_17';
  end if;

  return band;
end;
$$;

comment on function public.age_band_from_birth(integer, integer, public.age_check_result, date) is
  'Age group from year (and month) on a date; younger possible age; 13_or_over caps below 18 (S1-E2-02).';

/**
 * age_band: the signed-in user's age group today (Romanian time, the first market).
 * Returns: 'unknown' when signed out or when the profile is missing or deleted.
 * Where it fits: rating rules ("hide a 16+ story from anyone younger", CLAUDE.md rule 18) and
 * every under-18 protection read this one function (architecture 1.7.8).
 */
create or replace function public.age_band()
returns public.age_band
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select public.age_band_from_birth(
        profiles.birth_year,
        profiles.birth_month,
        profiles.age_check_result,
        (now() at time zone 'Europe/Bucharest')::date
      )
      from public.profiles
      where profiles.id = (select auth.uid()) and profiles.deleted_at is null
    ),
    'unknown'
  );
$$;

comment on function public.age_band() is
  'The signed-in user''s age group; unknown when signed out (architecture 1.7.8).';

/**
 * account_state: why an account can or can't write, checked in this order:
 *   deleted (or no profile) → email_unconfirmed → age_check_failed → minor_not_admitted
 *   (adults_only on and under 18, or under 13) → awaiting_parental_consent (under 16) →
 *   age_check_pending (unless adults_only is on and the person is 18 or over by year) → active.
 * Decisions: the March test is invited adults only, and while adults_only is on an adult is
 * active once the email is confirmed (decided 17 Oct 2026, 12:44; the flag is a proposal).
 * Under-16s need a parent's consent (GDPR Art 8; decided 16 Oct 2026, Q15): until S1-E2-03 adds
 * the consent lookup, every under-16 stays read-only (the safe default).
 * Input: target_user_id. Returns: an account_status value. Errors: none.
 * Not callable by clients: it would reveal other people's age status (privacy).
 */
create or replace function public.account_state(target_user_id uuid)
returns public.account_status
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
  email_confirmed_on timestamptz;
  band public.age_band;
  adults_only boolean := public.is_feature_enabled('adults_only');
begin
  -- 1. No profile, or a deleted one: nothing may be written.
  select * into profile_row from public.profiles where profiles.id = target_user_id;
  if not found or profile_row.deleted_at is not null then
    return 'deleted';
  end if;

  -- 2. The email must be confirmed before anything else (S1-E2-01).
  select users.email_confirmed_at into email_confirmed_on
  from auth.users where users.id = target_user_id;
  if email_confirmed_on is null then
    return 'email_unconfirmed';
  end if;

  -- 3. A failed age check keeps the account read-only until a manual check (S1-E2-08).
  if profile_row.age_check_result = 'failed' then
    return 'age_check_failed';
  end if;

  -- 4. Age group today, from the year (and month) and the check result.
  band := public.age_band_from_birth(
    profile_row.birth_year,
    profile_row.birth_month,
    profile_row.age_check_result,
    (now() at time zone 'Europe/Bucharest')::date
  );

  -- 5. Under 13 never; under 18 not while the March test is adults only.
  if band = 'under_13' or (adults_only and band <> '18_plus') then
    return 'minor_not_admitted';
  end if;

  -- 6. Under 16: a parent's consent first. S1-E2-03 replaces this with the consent lookup.
  if band = '13_to_15' then
    return 'awaiting_parental_consent';
  end if;

  -- 7. The age check must have passed, except for adults while adults_only is on.
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  return 'active';
end;
$$;

comment on function public.account_state(uuid) is
  'Internal: why an account can or cannot write; only active may write (architecture 1.7.8).';

/**
 * is_active_member: true only when the signed-in user may publish, comment, post or message.
 * Every write policy calls this one function (architecture 1.7.8). Signed out: false.
 */
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.account_state((select auth.uid())) = 'active', false);
$$;

comment on function public.is_active_member() is
  'True only when the signed-in user may write; every write policy calls it (architecture 1.7.8).';

/**
 * is_staff: true when the signed-in user holds a staff role.
 * Input: required_role; null means "any staff role". Returns: false when signed out.
 * Skeleton: an exact role match. S1-E2-07a decides whether owner and admin also count as the
 * other roles (architecture 1.8.3).
 */
create or replace function public.is_staff(required_role public.staff_role default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles
    join public.profiles on profiles.id = staff_roles.user_id
    where staff_roles.user_id = (select auth.uid())
      and profiles.deleted_at is null
      and (required_role is null or staff_roles.role = required_role)
  );
$$;

comment on function public.is_staff(public.staff_role) is
  'True when the signed-in user holds the role (any role when null) (architecture 1.8.3).';

/**
 * is_staff_session: true when this session may use staff powers.
 * March: any staff-role session (architecture 1.8.3; S1-E2-07a, decided 17 Oct 2026, 12:44).
 * After March, S1-E2-07b requires a Google Workspace sign-in on STAFF_EMAIL_DOMAIN.
 */
create or replace function public.is_staff_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff();
$$;

comment on function public.is_staff_session() is
  'True when the session may use staff powers; March: any staff role (S1-E2-07a, S1-E2-07b).';

-- Clients may call only the functions that answer about themselves. account_state() and
-- is_feature_enabled() stay internal: they could reveal other people's status or private flags.
revoke execute on function public.account_state(uuid) from public, anon, authenticated;
revoke execute on function public.is_feature_enabled(text) from public, anon, authenticated;
