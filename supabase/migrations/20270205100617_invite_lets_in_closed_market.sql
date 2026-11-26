/*
 * Migration: an invite link lets a person in from a country that isn't open yet (INVITE-MARKET;
 * Robert, 26 Nov 2026: "anybody who is invited by an invite link is let in regardless if they are
 * from a country that's not on the market list yet").
 *
 * What it changes:
 *   - invite_opens_closed_market(code): new. True when the code is a working invite: a live
 *     platform invite with a place left, or a class code that opens sign-up (check_invite says
 *     'valid'). A wrong, used-up or revoked code is false.
 *   - closed_market_age_outcome(country, birth year, birth month, region): new. The country's
 *     own age rule for someone let in by invite from a closed market: under_market_age when the
 *     rule blocks or is under its minimum, else ok. The market's open switch is the only rule
 *     the invite skips.
 *   - create_profile_from_sign_up(): step 2 lets a working invite past 'market_closed' and checks
 *     the country's age rule instead; step 5 then uses the invite (one of its places is taken,
 *     a class code joins its class), with the waiting list on or off.
 * What stays as it was: the product's own age rules (step 1, adults only during the trial), the
 * username, the terms and privacy consents, the returning-user check, the members-only wall and
 * desktop-only. Without a working invite a closed market still waits on the list (MARKETS-2b)
 * or is refused when the list is off.
 * How the invite travels: the existing /join/<code> link; the sign-up form already sends the code
 * as sign_up_data.invite_code (S1-E11-17), so nothing new is stored.
 * Tests: supabase/tests/database/415-invite-closed-market.test.sql.
 */

/**
 * invite_opens_closed_market: whether a code may let a person in from a closed market.
 * Internal (sign-up only). Input: the code as typed or taken from the link, or null.
 * Returns true only for a working platform invite or class code. Raises nothing.
 */
create or replace function public.invite_opens_closed_market(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- No code, no way past the closed market; otherwise the same answer the sign-up page shows.
  select coalesce(nullif(btrim(code), '') is not null and public.check_invite(code) = 'valid', false);
$$;

comment on function public.invite_opens_closed_market(text) is
  'Internal: whether a code is a working invite that lets someone in from a country not open yet (INVITE-MARKET).';

revoke all on function public.invite_opens_closed_market(text) from public, anon, authenticated;

/**
 * closed_market_age_outcome: the country's own age rule for someone invited from a closed market.
 * Internal (sign-up only). Inputs: the country, year and month of birth and region.
 * Returns under_market_age or ok, like sign_up_market_outcome() but without the open switch.
 * Raises nothing.
 */
create or replace function public.closed_market_age_outcome(country_code text, birth_year integer,
  birth_month integer default null, region_code text default '')
returns text
language sql
stable
security definer
set search_path = ''
as $$
  -- Step 1: the country's ages (S1-E2-22, MARKETS-1) still apply to an invited person.
  select case
    when public.age_rule_outcome(birth_year, birth_month, country_code, coalesce(region_code, ''))
      in ('blocked', 'under_minimum') then 'under_market_age'
    else 'ok'
  end;
$$;

comment on function public.closed_market_age_outcome(text, integer, integer, text) is
  'Internal: ok or under_market_age from the country''s age rule, for an invite from a closed market (INVITE-MARKET).';

revoke all on function public.closed_market_age_outcome(text, integer, integer, text) from public, anon, authenticated;

/**
 * create_profile_from_sign_up: the sign-up rules, the new profile and its consents.
 * Changed by INVITE-MARKET: a working invite gets past a closed market (step 2) and is used
 * (step 5). Everything else as in S1-E2-01, 02, 04, 10, S1-E11-17, MARKETS-2b and ADMIN-2.
 */
create or replace function public.create_profile_from_sign_up(new_user_id uuid, sign_up_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_locale text := sign_up_data ->> 'locale';
  place jsonb := public.sign_up_country(sign_up_data);
  birth_year smallint;
  birth_month smallint;
  country text;
  chosen_handle text;
  outcome text;
  waits_for_market boolean := false;
  invite_skips_market boolean := false;
begin
  -- Step 1: the year (and month) of birth, and the product's own age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 2: the country: the person's own answer, else the connection's (S1-E2-10), and its rules.
  -- INVITE-MARKET (Robert, 26 Nov 2026): a working invite lets the person in from a country that
  -- isn't open yet; the country's own age rule still applies. Otherwise (MARKETS-2b) a closed or
  -- unknown market waits on the list while it is on.
  country := coalesce(place ->> 'country', public.verified_signup_country(sign_up_data ->> 'signup_context'));
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month, place ->> 'region');
  if outcome = 'market_closed' and public.invite_opens_closed_market(sign_up_data ->> 'invite_code') then
    invite_skips_market := true;
    outcome := public.closed_market_age_outcome(country, birth_year, birth_month, place ->> 'region');
  end if;
  if outcome = 'market_closed' and public.is_feature_enabled('waitlist') then
    waits_for_market := true;
  elsif outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 3: the username (S1-E2-04).
  chosen_handle := public.sign_up_handle(sign_up_data);

  -- Step 4: the profile, with the form's language, the country (and region) and the username.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code, legal_region_code,
    country_chosen_at, handle)
  values (
    new_user_id,
    birth_year,
    birth_month,
    -- MARKETS-2a: any open interface language (sv, da, nb once staff open them), else Romanian.
    case when public.is_open_interface_language(chosen_locale) then chosen_locale else 'ro' end,
    country,
    place ->> 'region',
    case when place ->> 'country' is not null then now() end,
    chosen_handle
  );

  -- Step 5: the waiting list (WAITLIST-1), else the invite while the test is invite only
  -- (S1-E11-17), after the profile so the invite's audit row can name the new account. A class
  -- link counts too, and joins the class (IDEAS-3c). MARKETS-2b: without a working invite, from a
  -- closed market a code doesn't skip the queue. INVITE-MARKET: a working invite that let the
  -- person in from a closed market is always used, so it takes one of its places.
  if waits_for_market then
    perform public.join_waitlist_at_sign_up(new_user_id, sign_up_data - 'invite_code');
  elsif public.is_feature_enabled('waitlist') then
    perform public.join_waitlist_at_sign_up(new_user_id, sign_up_data);
  elsif public.is_feature_enabled('invite_only') or invite_skips_market then
    perform public.use_sign_up_invite(sign_up_data ->> 'invite_code', new_user_id);
  end if;

  -- Step 6: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new_user_id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new_user_id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  -- Step 7: the scrambled IP, and a moderator's case if it matches an account banned in the
  -- last 30 days (part f2). Never a refusal: schools share addresses, so a person decides.
  perform public.record_sign_up_ips(new_user_id, sign_up_data ->> 'signup_ip');
end;
$$;

comment on function public.create_profile_from_sign_up(uuid, jsonb) is
  'Internal: the sign-up rules and the new profile and consents, then the scrambled IP and the returning-user check (S1-E2-01, 02, 04, 10, S1-E11-17; shared since S1-E2-09; ADMIN-2 part f2; class codes IDEAS-3c; an invite lets in from a closed market, INVITE-MARKET).';
