/**
 * Migration: the username is chosen on the sign-up form, next to the password (Robert,
 * 25 Oct 2026, 07:04: "username should be part of the onboarding process. At the same time, you
 * put a password in"). Follows story S1-E2-04; bundle PEOPLE-3.
 *
 * What it changes:
 * - check_handle() may now be asked by a visitor too, so the sign-up form can say "@lia is free"
 *   before an account exists. Usernames are public already (every profile is /u/<username>), and
 *   the answer never says who holds a name.
 * - handle_new_auth_user(), the sign-up trigger, reads the username from the sign-up data
 *   ("handle"), checks it with the same check_handle() rules and stores it on the new profile. A
 *   refused or taken username refuses the whole sign-up, so no account is left half made. A
 *   sign-up without a username (an older app version) still works: /setup asks for it, as before.
 * Who calls it: Supabase Auth at sign-up (src/features/auth/api/signUp.ts sends the username);
 *   HandleField on the sign-up form (check_handle()).
 * Tests: supabase/tests/database/157-username-at-sign-up.test.sql.
 */

/* ---------- The username check, for visitors too ---------- */

-- A visitor's check answers as for a person with no username yet: no approvals, and every
-- existing name counts as taken (check_handle() compares with auth.uid(), null here).
grant execute on function public.check_handle(text) to anon;

/* ---------- The sign-up trigger, with the username ---------- */

/**
 * sign_up_handle: the username in the sign-up data, checked.
 * Input: the sign-up data (raw_user_meta_data). Returns: the username, or null when none was sent.
 * Errors: check_violation with check_handle()'s answer (taken, reserved, too_short and so on).
 * Internal: handle_new_auth_user().
 */
create or replace function public.sign_up_handle(sign_up_data jsonb)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chosen_handle text := nullif(sign_up_data ->> 'handle', '');
  outcome text;
begin
  -- Step 1: no username sent, so the person picks one in /setup (S1-E2-04).
  if chosen_handle is null then
    return null;
  end if;
  -- Step 2: the same rules as setup and Settings: length, look-alikes, listed words, taken.
  outcome := public.check_handle(chosen_handle);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the username rules: %.', outcome using errcode = 'check_violation';
  end if;
  return chosen_handle;
end;
$$;

comment on function public.sign_up_handle(jsonb) is
  'Internal: the checked username from the sign-up data, or null (S1-E2-04, username at sign-up).';
revoke execute on function public.sign_up_handle(jsonb) from public, anon, authenticated;

/**
 * handle_new_auth_user: as in S1-E10-06, plus the username from the sign-up form (step 5).
 * A refused username undoes the whole sign-up, like every other refusal here.
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
  country text;
  chosen_handle text;
  outcome text;
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: a banned account's email can't come back (S1-E10-06; DSA art. 23).
  if public.is_email_banned(new.email) then
    raise exception 'This email address can''t be used to sign up.' using errcode = 'check_violation';
  end if;

  -- Step 3: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 4: the country from the signed token, and the market rules (S1-E2-10).
  country := public.verified_signup_country(sign_up_data ->> 'signup_context');
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 5: the username chosen on the form, checked by the same rules as setup (S1-E2-04).
  chosen_handle := public.sign_up_handle(sign_up_data);

  -- Step 6: the profile, with the language the form was in, the country and the username. Two
  -- people taking look-alike names at the same moment: the unique index refuses the second.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code, handle)
  values (
    new.id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country,
    chosen_handle
  );

  -- Step 7: the March test is invite only (decided 17 Oct 2026, 12:44). After the profile, so the
  -- invite's audit row can name the new account (S1-E11-17); a refused invite still undoes it all.
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code', new.id);
  end if;

  -- Step 8: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new.id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new.id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: checks a sign-up (banned email, age, market, username, invite) and creates the profile and consents, or refuses it all (S1-E2-01, 02, 04, 10, S1-E11-17, S1-E10-06).';
