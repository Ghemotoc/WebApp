-- Year of birth at sign-up: the month when it's needed, under-13s and, in March, under-18s refused
-- (story S1-E2-02).
--
-- Rules (decided 16 Oct 2026, Q16; 17 Oct 2026, canvas comment; 17 Oct 2026, 12:44):
-- - Only the year is asked. The month is asked only when the year leaves the age unclear at 13 or
--   16 (in 2027, born 2014 could be 12 or 13; born 2011 could be 15 or 16), and only then stored.
-- - The person counts as the younger possible age (age_band_from_birth(), S1-E1-02).
-- - Under 13: refused with "We don't keep anything you typed"; nothing stored, no device or IP block.
-- - While adults_only is on (the March test): under 18 is refused, kindly; nothing stored.
-- What it adds:
--   birth_year_needs_month(year, on_date)   does this year need the month?
--   sign_up_age_outcome(year, month)        the form's question before sending: ok, month_needed,
--                                           under_13 or adults_only (stores nothing)
--   handle_new_auth_user()                  now stores the month and refuses what the rules refuse
-- Self-declaration alone isn't age assurance (Commission Guidelines C/2025/5519, para 52): the
-- year only chooses which age check runs (S1-E2-08, after March).

/**
 * birth_year_needs_month: whether a year of birth leaves the age unclear at 13 or 16 on a date.
 * Inputs: birth_year; on_date (today in Romanian time in practice).
 * Returns: true when the person turns 13 or 16 during on_date's year, so the month decides.
 */
create or replace function public.birth_year_needs_month(birth_year integer, on_date date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (extract(year from on_date)::integer - birth_year) in (13, 16);
$$;

comment on function public.birth_year_needs_month(integer, date) is
  'True when the year of birth leaves the age unclear at 13 or 16, so the month is asked (Q16, S1-E2-02).';

/**
 * sign_up_age_outcome: what sign-up would say about this year (and month), without storing anything.
 * Inputs: birth_year; birth_month (null when not given).
 * Returns: 'ok'; 'year_needed'; 'month_needed' (the year needs the month and none was given);
 *   'under_13'; or 'adults_only' (under 18 while the March flag is on).
 * Who may call it: anyone, signed out included: the sign-up form asks before sending. It reads
 *   nothing about anyone; it only applies the rules to the numbers given.
 * Where it fits: the form, and the sign-up trigger below, so both always agree.
 */
create or replace function public.sign_up_age_outcome(birth_year integer, birth_month integer default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Bucharest')::date;
  needs_month boolean;
  band public.age_band;
begin
  -- Step 1: the year is required; the month only when the year needs it.
  if birth_year is null then
    return 'year_needed';
  end if;
  needs_month := public.birth_year_needs_month(birth_year, today);
  if needs_month and birth_month is null then
    return 'month_needed';
  end if;
  -- Step 2: the younger possible age; a month given for a year that doesn't need it is ignored.
  band := public.age_band_from_birth(
    birth_year, case when needs_month then birth_month end, 'pending', today
  );
  -- Step 3: the minimum age, then the March rule.
  if band = 'under_13' then
    return 'under_13';
  end if;
  if public.is_feature_enabled('adults_only') and band <> '18_plus' then
    return 'adults_only';
  end if;
  return 'ok';
end;
$$;

comment on function public.sign_up_age_outcome(integer, integer) is
  'What sign-up says about a year (and month): ok, year_needed, month_needed, under_13 or adults_only (S1-E2-02).';

/**
 * sign_up_birth_month: reads the month from the sign-up data, only when the year needs it.
 * Inputs: sign_up_data; birth_year (already checked). Returns: 1 to 12, or null when not needed.
 * Errors: raises check_violation for a month that isn't 1 to 12.
 */
create or replace function public.sign_up_birth_month(sign_up_data jsonb, birth_year integer)
returns smallint
language plpgsql
stable
set search_path = ''
as $$
declare
  month_text text := sign_up_data ->> 'birth_month';
begin
  -- A month for a year that doesn't need it is never stored (data minimisation, GDPR Art 5(1)(c)).
  if not public.birth_year_needs_month(birth_year, (now() at time zone 'Europe/Bucharest')::date)
    or month_text is null then
    return null;
  end if;
  if month_text !~ '^\d{1,2}$' or month_text::integer not between 1 and 12 then
    raise exception 'The month of birth must be 1 to 12.' using errcode = 'check_violation';
  end if;
  return month_text::smallint;
end;
$$;

comment on function public.sign_up_birth_month(jsonb, integer) is
  'Internal: the month of birth from the sign-up data, only when the year needs it (S1-E2-02).';

/**
 * handle_new_auth_user: the trigger that turns a new Supabase Auth account into a member.
 * Runs: after every insert into auth.users (sign-up with a password or a magic link).
 * Steps: skip the seed personas → take an invite place while invite_only is on → check the year
 *   (and month) of birth against the age rules → create the profile → record the two consents.
 * Errors: any refusal raises, and the whole sign-up is undone (nothing stored, S1-E2-01 and
 *   S1-E2-02: an under-13's or, in March, an under-18's year is never kept).
 * Seed personas: supabase/seed.sql marks its synthetic accounts with app metadata
 *   {"seed_persona": true} and creates their profiles itself. App metadata can only be written by
 *   the server, never by the sign-up form, so nobody can use the mark to skip the checks.
 */
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sign_up_data jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_locale text := sign_up_data ->> 'locale';
  birth_year smallint;
  birth_month smallint;
  age_outcome text;
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: the March test is invite only (decided 17 Oct 2026, 12:44).
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code');
  end if;

  -- Step 3: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  age_outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if age_outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', age_outcome using errcode = 'check_violation';
  end if;

  -- Step 4: the profile, with the language the form was in (Romanian unless the person chose
  -- English, decided 17 Oct 2026, 11:48).
  insert into public.profiles (id, birth_year, birth_month, locale)
  values (
    new.id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end
  );

  -- Step 5: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new.id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new.id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: checks a sign-up and creates the profile and consents, or refuses it all (S1-E2-01, S1-E2-02).';

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.sign_up_birth_month(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.sign_up_age_outcome(integer, integer) from public;
grant execute on function public.sign_up_age_outcome(integer, integer) to anon, authenticated;
