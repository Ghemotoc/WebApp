-- Migration: sign-ups from a country that isn't open yet join the waiting list (bundle MARKETS-2,
-- part b; story S1-E11-32).
--
-- Decision: Robert, 8 Nov 2026, 08:06 UTC (the MARKETS-2 brief): "Given a sign-up from a closed or
-- unknown market, when the form is sent, then the person joins the WAITLIST-1 list with their
-- country instead of seeing 'market closed'"; staff let people in by country once that market
-- opens, never from a market still closed; the country's age rules apply when someone is let in.
--
-- What it changes:
--   waitlist_market_outcome()       new: may this waiting person be let in now? 'ok', 'market_closed'
--                                   or 'under_market_age', from the same rules as sign-up
--   create_profile_from_sign_up()   a closed or unknown market no longer refuses the sign-up while
--                                   the waiting list is on: the person waits, and an invitation code
--                                   doesn't skip the queue from a closed market
--   admit_waitlist_entry()          lets nobody in whose market isn't open, or who is under its age
--   admin_admit_from_waitlist()     refuses the whole choice, with the reason, if one ticked person
--                                   can't be let in yet
--   admin_admit_waitlist_wave()     refuses a wave for a closed country; a wave for every country
--                                   leaves out the people whose market is still closed
--   my_waitlist(), admin_waitlist() say each person's country and whether it is open
-- With the waiting list off, a closed market refuses the sign-up as before.
-- Rules: no new table; no email, IP or user text logged (CLAUDE.md rule 12); the user ID never
-- leaves a staff function (rule 15).

/* ---------- One rule for "may this person come in now" ---------- */

/**
 * waitlist_market_outcome: whether a person on the list may be let in now, by their market.
 * Input: target_user_id, the person. Returns: 'ok', 'market_closed' (closed, unknown or no
 * country) or 'under_market_age' (their country's age row refuses them today, S1-E2-22).
 * Errors: none. Where it fits: admit_waitlist_entry(), my_waitlist() and admin_waitlist() ask it,
 * through sign_up_market_outcome(), so sign-up and letting in follow one rule (the invited test
 * still admits adults from anywhere, Q6).
 */
create or replace function public.waitlist_market_outcome(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.sign_up_market_outcome(profiles.country_code, profiles.birth_year,
      profiles.birth_month, coalesce(profiles.legal_region_code, ''))
    from public.profiles where profiles.id = target_user_id), 'market_closed');
$$;

comment on function public.waitlist_market_outcome(uuid) is
  'ok, market_closed or under_market_age: whether a person on the waiting list may be let in now (MARKETS-2b).';

-- Internal: only the functions below call it.
revoke execute on function public.waitlist_market_outcome(uuid) from public, anon, authenticated;

/* ---------- Sign-up: a closed market waits on the list ---------- */

/**
 * create_profile_from_sign_up: builds the profile from the sign-up form (S1-E2-01 onwards).
 * Input: new_user_id, the new account; sign_up_data, the form's answers. Returns: nothing.
 * Errors: check_violation for the age rules, a closed market while the waiting list is off, the
 * username, a code or the legal versions. MARKETS-2b: while the waiting list is on, a closed or
 * unknown market joins the list instead (the age rules of that country run when staff let the
 * person in, admit_waitlist_entry()).
 * Where it fits: the trigger on auth.users calls it once per new account.
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
begin
  -- Step 1: the year (and month) of birth, and the product's own age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 2: the country: the person's own answer, else the connection's (S1-E2-10), and its rules.
  -- MARKETS-2b: a closed or unknown market waits on the list while it is on.
  country := coalesce(place ->> 'country', public.verified_signup_country(sign_up_data ->> 'signup_context'));
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month, place ->> 'region');
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
  -- link counts too, and joins the class (IDEAS-3c). MARKETS-2b: from a closed market a code
  -- doesn't skip the queue, so the code is left unused for someone it can let in.
  if waits_for_market then
    perform public.join_waitlist_at_sign_up(new_user_id, sign_up_data - 'invite_code');
  elsif public.is_feature_enabled('waitlist') then
    perform public.join_waitlist_at_sign_up(new_user_id, sign_up_data);
  elsif public.is_feature_enabled('invite_only') then
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

/* ---------- Letting people in ---------- */

/**
 * admit_waitlist_entry: lets one waiting person in and tells them (WAITLIST-1).
 * Input: target_entry_id, the entry; how, 'one_by_one' or 'wave' (for the audit row).
 * Returns: true when let in; false when the entry no longer waits, the account is gone, or
 * (MARKETS-2b) their market isn't open or its age rules refuse them today.
 * Errors: none. Where it fits: admin_admit_from_waitlist() and admin_admit_waitlist_wave().
 */
create or replace function public.admit_waitlist_entry(target_entry_id uuid, how text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.waitlist_entries;
begin
  -- Step 1: only an entry still waiting, for a live account whose market lets them in today
  -- (MARKETS-2b: the country's age row applies at this moment, S1-E2-22).
  update public.waitlist_entries set admitted_at = now()
  where waitlist_entries.id = target_entry_id and waitlist_entries.admitted_at is null
    and exists (select 1 from public.profiles
                where profiles.id = waitlist_entries.user_id and profiles.deleted_at is null)
    and public.waitlist_market_outcome(waitlist_entries.user_id) = 'ok'
  returning * into entry;
  if entry.id is null then
    return false;
  end if;
  -- Step 2: the "You're in" notice; it can't be switched off, like an account notice.
  insert into public.notifications (user_id, kind, is_required)
  values (entry.user_id, 'waitlist_admitted', true);
  -- Step 3: the audit row names who let the person in (architecture 1.8.1).
  perform public.log_staff_action('waitlist.admitted', 'waitlist_entries', entry.id::text, entry.user_id,
    null, jsonb_build_object('admitted_at', null),
    jsonb_build_object('admitted_at', entry.admitted_at, 'interest', entry.interest, 'how', how));
  return true;
end;
$$;

/**
 * admin_admit_from_waitlist: lets the ticked people in (WAITLIST-1).
 * Input: entry_ids, 1 to 100 entries. Returns: how many were let in.
 * Errors: insufficient_privilege for anyone but an owner or admin; check_violation with the hint
 * 'pick_people' for an empty or too long choice, and (MARKETS-2b) 'market_closed' or
 * 'under_market_age' when a ticked person can't be let in yet, so nobody is let in by half.
 * Where it fits: Staff › Waitlist, "Let in".
 */
create or replace function public.admin_admit_from_waitlist(entry_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted uuid;
  admitted integer := 0;
  refusal text;
begin
  -- Step 1: owner and admin only, in a staff session.
  if not public.staff_may('waitlist', 'act') then
    raise exception 'Only an owner or admin can let people in.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(cardinality(entry_ids), 0) not between 1 and 100 then
    raise exception 'Tick 1 to 100 people.' using errcode = 'check_violation', hint = 'pick_people';
  end if;
  -- Step 2: MARKETS-2b: refuse the whole choice if one ticked person waiting can't come in yet.
  select public.waitlist_market_outcome(entries.user_id) into refusal
  from public.waitlist_entries as entries
  where entries.id = any (entry_ids) and entries.admitted_at is null
    and public.waitlist_market_outcome(entries.user_id) <> 'ok'
  limit 1;
  if refusal is not null then
    raise exception 'Someone ticked can''t be let in yet: %.', refusal
      using errcode = 'check_violation', hint = refusal;
  end if;
  -- Step 3: each person, in the order ticked.
  foreach wanted in array entry_ids loop
    if public.admit_waitlist_entry(wanted, 'one_by_one') then
      admitted := admitted + 1;
    end if;
  end loop;
  return admitted;
end;
$$;

/**
 * admin_admit_waitlist_wave: lets in the oldest confirmed people who fit (WAITLIST-1).
 * Input: wanted_interest (write, read or null for all), wanted_country (or null), how_many
 * (1 to 1,000). Returns: how many were let in.
 * Errors: insufficient_privilege for anyone but an owner or admin; check_violation with the hint
 * 'wave_size', or (MARKETS-2b) 'market_closed' for a country whose market isn't open. A wave for
 * every country leaves out the people whose market is still closed.
 * Where it fits: Staff › Waitlist, "Let in a wave".
 */
create or replace function public.admin_admit_waitlist_wave(wanted_interest text, wanted_country text, how_many integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  country_filter text := nullif(upper(btrim(coalesce(wanted_country, ''))), '');
  interest_filter text := nullif(btrim(coalesce(wanted_interest, '')), '');
  next_entry uuid;
  admitted integer := 0;
begin
  -- Step 1: owner and admin only, in a staff session, with a sensible size.
  if not public.staff_may('waitlist', 'act') then
    raise exception 'Only an owner or admin can let people in.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(how_many, 0) not between 1 and 1000 then
    raise exception 'A wave is 1 to 1,000 people.' using errcode = 'check_violation', hint = 'wave_size';
  end if;
  -- Step 2: MARKETS-2b: a wave for one country needs that market open (an adult's birth year
  -- stands in for the market check, which is all the country's door asks before the ages).
  if country_filter is not null
     and public.sign_up_market_outcome(country_filter, 1970, null, '') = 'market_closed' then
    raise exception 'This country isn''t open yet.' using errcode = 'check_violation', hint = 'market_closed';
  end if;
  -- Step 3: the oldest confirmed people who fit and may come in today, each let in and told.
  for next_entry in
    select entries.id from public.waitlist_entries as entries
    join public.profiles on profiles.id = entries.user_id
    join auth.users on users.id = entries.user_id
    where entries.admitted_at is null and profiles.deleted_at is null and users.email_confirmed_at is not null
      and public.waitlist_interest_matches(entries.interest, interest_filter)
      and (country_filter is null or profiles.country_code = country_filter)
      and public.waitlist_market_outcome(entries.user_id) = 'ok'
    order by entries.joined_at, entries.id
    limit how_many
  loop
    if public.admit_waitlist_entry(next_entry, 'wave') then
      admitted := admitted + 1;
    end if;
  end loop;
  return admitted;
end;
$$;

/* ---------- What the person and staff see ---------- */

/**
 * my_waitlist: the signed-in person's place on the list (WAITLIST-1).
 * Returns: { on_list: false } or { on_list, waiting, interest, joined_at, admitted_at, country,
 * market_open } (MARKETS-2b: the holding page says when the person waits for their country).
 * Errors: insufficient_privilege when signed out. Where it fits: WaitlistGate and the holding page.
 */
create or replace function public.my_waitlist()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entry public.waitlist_entries;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your place on the list.' using errcode = 'insufficient_privilege';
  end if;
  select * into entry from public.waitlist_entries where waitlist_entries.user_id = (select auth.uid());
  if entry.id is null then
    return jsonb_build_object('on_list', false);
  end if;
  -- A staff account is never held on the list (account_state() step 4 comes first), so its holding
  -- page never shows.
  return jsonb_build_object('on_list', true,
    'waiting', entry.admitted_at is null
      and not exists (select 1 from public.staff_roles where staff_roles.user_id = entry.user_id),
    'interest', entry.interest, 'joined_at', entry.joined_at, 'admitted_at', entry.admitted_at,
    'country', (select profiles.country_code from public.profiles where profiles.id = entry.user_id),
    'market_open', public.waitlist_market_outcome(entry.user_id) <> 'market_closed');
end;
$$;

/**
 * admin_waitlist: the people waiting, with the counts (WAITLIST-1).
 * Input: wanted_interest, wanted_country, page_size (1 to 100), page_offset.
 * Returns: counts, countries (each with waiting and, MARKETS-2b, open), matching and one page of
 * people (each with market_open). Errors: insufficient_privilege for anyone but an owner or admin.
 * Where it fits: Staff › Waitlist.
 */
create or replace function public.admin_waitlist(wanted_interest text default null, wanted_country text default null,
  page_size integer default 50, page_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  country_filter text := nullif(upper(btrim(coalesce(wanted_country, ''))), '');
  interest_filter text := nullif(btrim(coalesce(wanted_interest, '')), '');
begin
  -- Step 1: owner and admin only, in a staff session.
  if not public.staff_may('waitlist', 'view') then
    raise exception 'Only an owner or admin can see the waiting list.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the counts, the countries (open or not), and one page of the people who fit.
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
        'waiting', count(*) filter (where entries.admitted_at is null),
        'write', count(*) filter (where entries.admitted_at is null and entries.interest = 'write'),
        'read', count(*) filter (where entries.admitted_at is null and entries.interest = 'read'),
        'both', count(*) filter (where entries.admitted_at is null and entries.interest = 'both'),
        'admitted', count(*) filter (where entries.admitted_at is not null))
      from public.waitlist_entries as entries),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('country', listed.country, 'waiting', listed.waiting,
          'open', public.sign_up_market_outcome(nullif(listed.country, 'ZZ'), 1970, null, '') <> 'market_closed')
        order by listed.waiting desc, listed.country)
      from (select coalesce(profiles.country_code, 'ZZ') as country, count(*) as waiting
            from public.waitlist_entries as entries join public.profiles on profiles.id = entries.user_id
            where entries.admitted_at is null and profiles.deleted_at is null
            group by 1) as listed), '[]'::jsonb),
    'matching', (select count(*) from public.waitlist_entries as entries
      join public.profiles on profiles.id = entries.user_id
      where entries.admitted_at is null and profiles.deleted_at is null
        and public.waitlist_interest_matches(entries.interest, interest_filter)
        and (country_filter is null or profiles.country_code = country_filter)),
    'people', coalesce((select jsonb_agg(person.row_json order by person.joined_at, person.entry_id)
      from (select entries.id as entry_id, entries.joined_at, jsonb_build_object(
              'entry_id', entries.id, 'handle', profiles.handle,
              'display_name', public.display_name(profiles.handle, profiles.pen_name),
              'interest', entries.interest, 'country', profiles.country_code,
              'joined_at', entries.joined_at, 'email_confirmed', users.email_confirmed_at is not null,
              'market_open', public.waitlist_market_outcome(entries.user_id) <> 'market_closed') as row_json
            from public.waitlist_entries as entries
            join public.profiles on profiles.id = entries.user_id
            join auth.users on users.id = entries.user_id
            where entries.admitted_at is null and profiles.deleted_at is null
              and public.waitlist_interest_matches(entries.interest, interest_filter)
              and (country_filter is null or profiles.country_code = country_filter)
            order by entries.joined_at, entries.id
            limit least(greatest(coalesce(page_size, 50), 1), 100)
            offset greatest(coalesce(page_offset, 0), 0)) as person), '[]'::jsonb));
end;
$$;
