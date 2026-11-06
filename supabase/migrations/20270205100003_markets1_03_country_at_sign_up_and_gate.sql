-- Migration: the member's own country, and the age gate following its rules (bundle MARKETS-1,
-- stories S1-E2-20 and S1-E2-22).
--
-- Robert's go-ahead, 6 Nov 2026, 10:19 UTC: "Yes, they should know the country." This replaces
-- Q20 (16 Oct 2026: the country came only from the connection and was never asked). The country
-- of the connection stays a hint that fills the field in; the person says where they live.
--
-- What it changes:
--   profiles.legal_region_code     a region with its own age law where the person lives (Quebec,
--                                  a US state with its own rule); '' for the whole country. Not
--                                  the Romanian county (region_code, S1-E2-06).
--   profiles.country_chosen_at     when the person said which country they live in; empty for
--                                  accounts made before this bundle, who are asked once
--   profiles.consent_grace_until   when a parent's consent becomes required because the rules
--                                  changed (staff changed a row, or the person moved country):
--                                  14 days to ask before the account turns read-only
--   birth_year_needs_month_where() the month is also asked when the year leaves the age unclear
--                                  at the country's own ages
--   sign_up_birth_month()          uses it
--   sign_up_market_outcome()       the country's rule decides who is too young, not markets
--   create_profile_from_sign_up()  stores the chosen country and region, and when they were chosen
--   account_state()                a parent's consent is needed below the country's age, not 16
--   needs_country_consent()        whether the country's rule asks for a parent's yes
--   my_parental_consent()          also answers during the 14 days' grace
--   parental_consent_deadline()    never before the grace ends plus 14 days
--   set_my_country()               a member changes country in Settings, checked first
--   admin_save_age_rule()          also gives members newly asked for consent their 14 days
-- Ground rules (brief MARKETS-1): the 16 split for spaces, messages with adults, picture review
-- and ratings (age_band()) is product policy and does not change by country.

/* ---------- The profile's country ---------- */

alter table public.profiles
  add column legal_region_code text not null default '',
  add column country_chosen_at timestamptz,
  add column consent_grace_until timestamptz,
  add constraint profiles_legal_region_shape check (legal_region_code ~ '^([A-Z0-9]{1,3})?$');

comment on column public.profiles.legal_region_code is
  'A region with its own age law where the person lives (Quebec, a US state), or ''''; not the county in region_code (MARKETS-1).';
comment on column public.profiles.country_chosen_at is
  'When the person said which country they live in; empty for accounts made before MARKETS-1, who are asked once.';
comment on column public.profiles.consent_grace_until is
  'Until when a member newly asked for a parent''s consent (the rules changed) keeps writing; 14 days (MARKETS-1, S1-E2-22).';

-- The member reads their own new columns like the rest of their profile; nobody writes them
-- directly (set_my_country() and the sign-up do).
grant select (legal_region_code, country_chosen_at, consent_grace_until) on public.profiles to authenticated;

/* ---------- The month of birth, at the country's ages ---------- */

/**
 * birth_year_needs_month_where: whether the year alone leaves someone's age unclear at an age
 * that matters where they live.
 * Inputs: birth_year; on_date; country_code and region_code (the rule, age_rule_for()).
 * Returns: true when the year-only age is 13 or 16 (the product's own lines, S1-E2-02) or one of
 *   the country's minimum, parental consent or sign-up block ages.
 * Why: CLAUDE.md rule 5 keeps the month only when the year leaves the age unclear; a 14 in Quebec
 *   or an 18 in India is such a line too.
 */
create or replace function public.birth_year_needs_month_where(
  birth_year integer,
  on_date date,
  country_code text,
  region_code text default ''
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  rule public.country_age_rules := public.age_rule_for(country_code, region_code);
  year_age integer := extract(year from on_date)::integer - birth_year;
begin
  return public.birth_year_needs_month(birth_year, on_date)
    or year_age in (rule.minimum_age, rule.parental_consent_below, coalesce(rule.signup_blocked_below, -1));
end;
$$;

comment on function public.birth_year_needs_month_where(integer, date, text, text) is
  'True when the year leaves the age unclear at 13, 16 or one of the country''s own ages (MARKETS-1).';

/**
 * sign_up_country: the country and region the person chose at sign-up, checked.
 * Input: the sign-up data (sign_up_data ->> 'country', ->> 'legal_region').
 * Returns: {country, region}: the chosen two-letter code (never "ZZ"), or null when none was sent;
 *   the region only when the rules have a row for it, '' otherwise.
 */
create or replace function public.sign_up_country(sign_up_data jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chosen text := upper(btrim(coalesce(sign_up_data ->> 'country', '')));
  region text := upper(btrim(coalesce(sign_up_data ->> 'legal_region', '')));
begin
  if chosen !~ '^[A-Z]{2}$' or chosen = 'ZZ' then
    return jsonb_build_object('country', null, 'region', '');
  end if;
  if not exists (select 1 from public.country_age_rules as rules
                 where rules.country_code = chosen and rules.region_code = region and region <> '') then
    region := '';
  end if;
  return jsonb_build_object('country', chosen, 'region', region);
end;
$$;

comment on function public.sign_up_country(jsonb) is
  'The country (and region with its own age law) chosen at sign-up, checked (MARKETS-1, S1-E2-20).';

/**
 * sign_up_birth_month: as in S1-E2-02, but the month is kept also when the year leaves the age
 * unclear at the chosen country's own ages (birth_year_needs_month_where()).
 * Inputs: the sign-up data and the year. Returns: the month, or null when it isn't needed.
 * Errors: check_violation for a month outside 1 to 12.
 */
drop function if exists public.sign_up_birth_month(jsonb, integer);
create function public.sign_up_birth_month(sign_up_data jsonb, birth_year integer)
returns smallint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  month_text text := sign_up_data ->> 'birth_month';
  place jsonb := public.sign_up_country(sign_up_data);
begin
  if not public.birth_year_needs_month_where(birth_year, (now() at time zone 'Europe/Bucharest')::date,
      place ->> 'country', place ->> 'region')
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
  'The month of birth from the sign-up, kept only when the year leaves the age unclear at 13, 16 or the country''s ages (S1-E2-02, MARKETS-1).';
revoke execute on function public.sign_up_birth_month(jsonb, integer) from public, anon, authenticated;

/* ---------- Who may join from where ---------- */

/**
 * sign_up_market_outcome: may someone this old join from this country?
 * Inputs: country_code (the chosen one, else the connection's), birth_year, birth_month,
 *   region_code. Returns: 'ok', 'market_closed' or 'under_market_age'.
 * Changed by MARKETS-1: the country's age rule (minimum age, sign-up blocked below) decides who is
 *   too young; markets.minimum_age is no longer read. While invite_only and adults_only are both
 *   on (the March test), a valid invite admits an adult from anywhere (Q6), as before.
 */
drop function if exists public.sign_up_market_outcome(text, integer, integer);
create function public.sign_up_market_outcome(
  country_code text,
  birth_year integer,
  birth_month integer default null,
  region_code text default ''
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  market_row public.markets;
begin
  -- Step 1: the invited test admits adults from anywhere (Q6b, Q6c).
  if public.is_feature_enabled('invite_only') and public.is_feature_enabled('adults_only') then
    return 'ok';
  end if;
  -- Step 2: a closed or unknown market is closed.
  select * into market_row from public.markets where markets.country_code = sign_up_market_outcome.country_code;
  if not found or not market_row.is_open then
    return 'market_closed';
  end if;
  -- Step 3: the country's own ages (S1-E2-22).
  if public.age_rule_outcome(birth_year, birth_month, country_code, region_code) in ('blocked', 'under_minimum') then
    return 'under_market_age';
  end if;
  return 'ok';
end;
$$;

comment on function public.sign_up_market_outcome(text, integer, integer, text) is
  'Whether someone this old may join from this country: ok, market_closed or under_market_age, from the country''s age rule (S1-E2-10, MARKETS-1).';
grant execute on function public.sign_up_market_outcome(text, integer, integer, text) to anon, authenticated;

/**
 * create_profile_from_sign_up: as before (S1-E2-01 onwards), with the chosen country.
 * Changed by MARKETS-1: the country is the one the person chose (the connection's only when none
 *   was sent, for an older form); the region with its own age law is kept; country_chosen_at says
 *   it was the person's own answer. Under the country's minimum or block age, sign-up stops with
 *   no account made (S1-E2-22, criterion 3).
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
begin
  -- Step 1: the year (and month) of birth, and the product's own age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 2: the country: the person's own answer, else the connection's (S1-E2-10), and its rules.
  country := coalesce(place ->> 'country', public.verified_signup_country(sign_up_data ->> 'signup_context'));
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month, place ->> 'region');
  if outcome <> 'ok' then
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
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country,
    place ->> 'region',
    case when place ->> 'country' is not null then now() end,
    chosen_handle
  );

  -- Step 5: the invite, while the test is invite only (S1-E11-17), after the profile so the
  -- invite's audit row can name the new account. A class link counts too, and joins the class
  -- (IDEAS-3c).
  if public.is_feature_enabled('invite_only') then
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

/* ---------- The gate ---------- */

/**
 * needs_country_consent: whether the rule where someone lives asks for a parent's consent and
 * none has been given.
 * Input: the account. Returns: true when the parental_consent flag is on, the country's rule
 *   says consent_needed for their year (and month) of birth, and no parent has agreed.
 * Where it fits: account_state() and my_parental_consent(); GDPR art. 8 and local equivalents.
 */
create or replace function public.needs_country_consent(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('parental_consent')
    and public.age_rule_outcome(profiles.birth_year, profiles.birth_month, profiles.country_code,
          profiles.legal_region_code) = 'consent_needed'
    and not public.has_parental_consent(target_user_id)
  from public.profiles where profiles.id = target_user_id;
$$;

comment on function public.needs_country_consent(uuid) is
  'True when the age rule where the person lives asks for a parent''s consent and none was given (MARKETS-1, S1-E2-22).';
revoke execute on function public.needs_country_consent(uuid) from public, anon, authenticated;

/**
 * account_state: as before (S1-E1-02 onwards); step 6 changed by MARKETS-1.
 * Step 6 now asks for a parent's consent below the age the country's rule sets (16 in Romania, 13
 *   in the UK, 14 in Quebec …), instead of below 16 everywhere. During the 14 days' grace after
 *   the rules changed for someone (consent_grace_until), the account stays active and the app
 *   asks; after it, the account is read-only until a parent agrees.
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
  -- Step 1: no live profile, no account.
  select * into profile_row from public.profiles where profiles.id = target_user_id;
  if not found or profile_row.deleted_at is not null then
    return 'deleted';
  end if;

  -- Step 2: the email must be confirmed (S1-E2-01).
  select users.email_confirmed_at into email_confirmed_on
  from auth.users where users.id = target_user_id;
  if email_confirmed_on is null then
    return 'email_unconfirmed';
  end if;

  -- Step 3: a ban or a suspension stops every write (S1-E10-06; DSA art. 23).
  if (public.active_sanction(target_user_id, 'ban')).id is not null then
    return 'banned';
  end if;
  if (public.active_sanction(target_user_id, 'suspension')).id is not null then
    return 'suspended';
  end if;

  -- Step 4: a staff account never writes as a member; a writer account stays separate (Q14a).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    return 'staff_account';
  end if;

  -- Step 5: the age rules (S1-E2-02, S1-E2-08), the age check before a parent is asked.
  if profile_row.age_check_result = 'failed' then
    return 'age_check_failed';
  end if;
  band := public.age_band_from_birth(
    profile_row.birth_year,
    profile_row.birth_month,
    profile_row.age_check_result,
    (now() at time zone 'Europe/Bucharest')::date
  );
  if band = 'under_13' or (adults_only and band <> '18_plus') then
    return 'minor_not_admitted';
  end if;
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  -- Step 6: below the age the country's rule sets, a parent's or guardian's yes (S1-E2-03,
  -- MARKETS-1; GDPR art. 8 and local equivalents), after any grace the rules gave.
  if public.needs_country_consent(target_user_id)
     and coalesce(profile_row.consent_grace_until, '-infinity') <= now() then
    return 'awaiting_parental_consent';
  end if;

  -- Step 7: a username, so what the person writes can be shown with a name (S1-E2-04).
  if profile_row.handle is null then
    return 'handle_missing';
  end if;

  -- Step 8: a new important version of the terms or privacy notice must be accepted (S1-E14-01).
  if public.needs_legal_acceptance(target_user_id) then
    return 'legal_acceptance_required';
  end if;

  return 'active';
end;
$$;

/**
 * parental_consent_deadline: as in S1-E2-03 (14 days from sign-up or the age check), but never
 * before the grace ends plus 14 days, so a member the rules newly asked for consent is not
 * erased by the nightly clean-up the day their grace ends (MARKETS-1).
 */
create or replace function public.parental_consent_deadline(target_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    greatest(users.created_at, coalesce(profiles.age_checked_at, users.created_at)) + interval '14 days',
    coalesce(profiles.consent_grace_until + interval '14 days', '-infinity'))
  from public.profiles join auth.users on users.id = profiles.id
  where profiles.id = target_user_id;
$$;

/**
 * my_parental_consent: as in S1-E2-03, and during the 14 days' grace it says consent is needed,
 * with the grace's end, so the app asks before the account turns read-only (S1-E2-22,
 * criterion 4).
 */
create or replace function public.my_parental_consent()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  latest public.parental_consents;
  needs_consent boolean;
  grace_until timestamptz;
begin
  if me is null then
    raise exception 'Sign in to ask a parent or guardian.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = me and deleted_at is null) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into latest from public.parental_consents
  where parental_consents.user_id = me and parental_consents.status <> 'replaced'
  order by parental_consents.created_at desc limit 1;
  -- Needed now (read-only), or soon (the grace is running and the rule asks for it).
  select profiles.consent_grace_until into grace_until from public.profiles where id = me;
  needs_consent := public.account_state(me) = 'awaiting_parental_consent'
    or (grace_until > now() and public.needs_country_consent(me));
  return jsonb_build_object(
    'outcome', 'ok',
    'needs_consent', needs_consent,
    'grace_until', case when grace_until > now() and needs_consent then grace_until end,
    'status', latest.status,
    'parent_email', latest.parent_email,
    'language', latest.language,
    'sent_at', latest.created_at,
    'decided_at', latest.decided_at,
    'deadline', public.parental_consent_deadline(me),
    'can_send', needs_consent and coalesce(latest.status, 'none') <> 'withdrawn');
end;
$$;

/* ---------- Changing country ---------- */

/**
 * set_my_country: a member says which country (and region with its own age law) they live in,
 * from Settings or the one-time question.
 * Inputs: country_code (two letters, never "ZZ"); region_code ('' or a region the rules list).
 * Returns: {outcome: 'ok', consent_needed: true when the new country's rule asks for a parent's
 *   yes that hasn't been given, grace_until when that starts a grace}.
 * Errors: insufficient_privilege when signed out; check_violation with hint 'unknown_country' for
 *   a code that isn't one; check_violation with hint 'under_country_age' when the new country
 *   doesn't allow someone this young (the change is not saved, criterion 2).
 * Grace: when the change newly asks for a parent's consent, the member keeps writing for 14 days
 *   while they ask (S1-E2-22, criterion 4).
 */
create or replace function public.set_my_country(country_code text, region_code text default '')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  place jsonb := public.sign_up_country(jsonb_build_object('country', country_code, 'legal_region', region_code));
  profile_row public.profiles;
  outcome text;
  needed_before boolean;
  grace timestamptz;
begin
  -- Step 1: a signed-in member, and a real code.
  if me is null then
    raise exception 'Sign in to set your country.' using errcode = 'insufficient_privilege';
  end if;
  if place ->> 'country' is null then
    raise exception 'Pick a country.' using errcode = 'check_violation', hint = 'unknown_country';
  end if;
  select * into profile_row from public.profiles where profiles.id = me for update;
  -- Step 2: the new country's rule, checked before anything is saved (criterion 2).
  outcome := public.age_rule_outcome(profile_row.birth_year, profile_row.birth_month,
    place ->> 'country', place ->> 'region');
  if outcome in ('blocked', 'under_minimum') then
    raise exception 'People your age can''t use the app in that country.' using errcode = 'check_violation', hint = 'under_country_age';
  end if;
  -- Step 3: save it; a consent the old rule didn't ask for starts the 14 days' grace.
  needed_before := coalesce(public.needs_country_consent(me), false);
  update public.profiles set country_code = place ->> 'country', legal_region_code = place ->> 'region',
    country_chosen_at = now()
  where profiles.id = me;
  if public.needs_country_consent(me) and not needed_before then
    grace := now() + interval '14 days';
    update public.profiles set consent_grace_until = grace where profiles.id = me;
  end if;
  return jsonb_build_object('outcome', 'ok', 'consent_needed', coalesce(public.needs_country_consent(me), false),
    'grace_until', grace);
end;
$$;

comment on function public.set_my_country(text, text) is
  'A member sets the country (and region) they live in, after checking its age rule; a new consent need starts 14 days'' grace (MARKETS-1).';
revoke execute on function public.set_my_country(text, text) from public, anon;
grant execute on function public.set_my_country(text, text) to authenticated;

/* ---------- When staff change a rule ---------- */

/**
 * start_consent_grace_for_rule: gives every member the rule now asks for a parent's consent 14
 * days to ask, before the account turns read-only (S1-E2-22, criterion 4).
 * Input: the rule's ID. Returns: how many members got the grace.
 * Who: members whose rule this is (age_rule_for()), who need consent now and had no grace yet.
 */
create or replace function public.start_consent_grace_for_rule(rule_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  started integer;
begin
  update public.profiles set consent_grace_until = now() + interval '14 days'
  where profiles.deleted_at is null
    and profiles.consent_grace_until is null
    and (public.age_rule_for(profiles.country_code, profiles.legal_region_code)).id = rule_id
    and public.needs_country_consent(profiles.id)
    and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id);
  get diagnostics started = row_count;
  return started;
end;
$$;

comment on function public.start_consent_grace_for_rule(uuid) is
  'Gives members a changed age rule newly asks for a parent''s consent 14 days to ask (MARKETS-1).';
revoke execute on function public.start_consent_grace_for_rule(uuid) from public, anon, authenticated;

/**
 * admin_save_age_rule: as in the first MARKETS-1 migration, and members the change newly asks
 * for a parent's consent get their 14 days (start_consent_grace_for_rule()). The audit row says
 * how many.
 */
create or replace function public.admin_save_age_rule(rule jsonb, reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted_country text := upper(btrim(coalesce(rule ->> 'country_code', '')));
  wanted_region text := upper(btrim(coalesce(rule ->> 'region_code', '')));
  before_row public.country_age_rules;
  after_row public.country_age_rules;
  graced integer;
begin
  -- Step 1: owner and admin only, in a staff session, with a reason.
  if not public.staff_may('settings', 'act') then
    raise exception 'Only an owner or admin can change the age rules.' using errcode = 'insufficient_privilege';
  end if;
  if char_length(btrim(coalesce(reason, ''))) = 0 then
    raise exception 'Say why the rule changes.' using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 2: the row as it was, if any.
  select * into before_row from public.country_age_rules
  where country_age_rules.country_code = wanted_country and country_age_rules.region_code = wanted_region
  for update;
  -- Step 3: write it; the table's checks refuse values out of range.
  insert into public.country_age_rules as rules (country_code, region_code, name, region_name,
    minimum_age, parental_consent_below, signup_blocked_below, legal_basis, source, date_checked,
    confidence, status, notes)
  values (wanted_country, wanted_region, btrim(coalesce(rule ->> 'name', '')),
    btrim(coalesce(rule ->> 'region_name', '')),
    (rule ->> 'minimum_age')::smallint, (rule ->> 'parental_consent_below')::smallint,
    nullif(rule ->> 'signup_blocked_below', '')::smallint,
    btrim(coalesce(rule ->> 'legal_basis', '')), btrim(coalesce(rule ->> 'source', '')),
    coalesce((rule ->> 'date_checked')::date, current_date),
    coalesce(rule ->> 'confidence', 'medium'), coalesce(rule ->> 'status', 'to_verify'),
    btrim(coalesce(rule ->> 'notes', '')))
  on conflict (country_code, region_code) do update set
    name = excluded.name, region_name = excluded.region_name, minimum_age = excluded.minimum_age,
    parental_consent_below = excluded.parental_consent_below,
    signup_blocked_below = excluded.signup_blocked_below, legal_basis = excluded.legal_basis,
    source = excluded.source, date_checked = excluded.date_checked,
    confidence = excluded.confidence, status = excluded.status, notes = excluded.notes
  returning * into after_row;
  -- Step 4: members newly asked for a parent's consent get 14 days (criterion 4).
  graced := public.start_consent_grace_for_rule(after_row.id);
  -- Step 5: the audit row, with the values before and after and how many got the grace.
  perform public.log_staff_action('age_rule.saved', 'country_age_rules', after_row.id::text, null,
    btrim(reason),
    case when before_row.id is null then null else to_jsonb(before_row) - 'created_at' - 'updated_at' end,
    (to_jsonb(after_row) - 'created_at' - 'updated_at') || jsonb_build_object('members_given_grace', graced));
  return after_row.id;
end;
$$;
