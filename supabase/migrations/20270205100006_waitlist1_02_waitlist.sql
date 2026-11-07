-- Migration: the waiting list (bundle WAITLIST-1, story S1-E2-24).
--
-- Decision: Robert, 6 Nov 2026, 17:25 to 17:27 UTC, chose the improved waiting list on a decision
-- card. It reverses Q15 (17 Oct 2026, 19:43: "no waiting list, no email kept"). In short:
--   - people fill in the same sign-up form; the confirmation email says "You're on the list";
--   - one extra question: do you want to write, read or both;
--   - a confirmed account on the list signs in to a holding page (avatar, favourite genres) but
--     can't write, read or post yet (account_state() 'waitlisted');
--   - staff let people in one by one or in waves (writers first, by country), and each gets a
--     "You're in" email with a link to sign in, never a code;
--   - an invitation code (S1-E11-17) still skips the queue;
--   - everyone who signs up while the list is on gets a small "founding member" badge;
--   - occasional news only with a separate opt-in (the existing marketing_email_opt_in, adults
--     only; Law 506/2004 and Q50).
--
-- What it adds or changes:
--   feature flag 'waitlist'           on: new sign-ups without a code wait; off: as before
--   waitlist_entries                  one row per person who signed up while the list was on
--   profiles.founding_member_since    when an early member joined; shown as a badge
--   staff area 'waitlist'             owner and admin (People group in the staff menu)
--   create_profile_from_sign_up()     a code is optional while the list is on; stores the answer
--   account_state()                   'waitlisted' while the person's entry waits
--   may_change_own_avatar()           someone waiting may build their avatar
--   my_waitlist(), set_my_waitlist_interest()  the holding page
--   admin_waitlist(), admin_admit_from_waitlist(), admin_admit_waitlist_wave()  Staff › Waitlist
--   email_delivery_for(), notification_category()  the "You're in" notice is always emailed
--   data_export_tables(), get_writer_profile(), staff_dashboard()  the new table and badge
--
-- Unconfirmed accounts: the nightly purge_unconfirmed_accounts() already deletes any account
-- whose email isn't confirmed within 7 days (unconfirmed_account_days, S1-E13-04), the list's
-- included, which is sooner than the 30 days the decision card named.
-- Rules: RLS on the new table with explicit grants (CLAUDE.md rule 1, Conventions); no email, IP
-- or user text logged (rule 12); the user ID never leaves a staff function (rule 15).

/* ---------- The switch ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description)
values ('waitlist', true, true,
  'While on, people who sign up without an invitation code wait on the list until staff let them in (WAITLIST-1).')
on conflict (key) do nothing;

/* ---------- The founding member badge ---------- */

alter table public.profiles add column founding_member_since timestamptz;

comment on column public.profiles.founding_member_since is
  'When a person joined while the waiting list was on: shown publicly only as "Founding member" (WAITLIST-1).';

/* ---------- The list ---------- */

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  -- The person on the list (CLAUDE.md rule 15); the entry goes with the account.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Their answer to "write, read or both"; they can change it on the holding page.
  interest public.waitlist_interest not null default 'both',
  -- When they joined the list: the queue's order.
  joined_at timestamptz not null default now(),
  -- When staff let them in, or when an invitation code let them skip the queue; empty while
  -- they wait. Who let them in is in the audit log, not here, so Download my data holds no
  -- staff member's ID.
  admitted_at timestamptz,
  -- Whether a code let them in at sign-up (true) or staff did (false); for the counts.
  admitted_by_code boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_entries_one_per_person unique (user_id),
  constraint waitlist_entries_code_means_admitted check (not admitted_by_code or admitted_at is not null)
);

comment on table public.waitlist_entries is
  'kind: user_action
One person who signed up while the waiting list was on, what they come for and when they were let in (WAITLIST-1, S1-E2-24).';

-- The queue as staff read it: who is still waiting, oldest first.
create index waitlist_entries_waiting on public.waitlist_entries (joined_at) where admitted_at is null;

create trigger waitlist_entries_set_updated_at
  before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

-- The owner column never changes (architecture 1.6, the user ID).
create trigger waitlist_entries_refuse_user_id_change
  before update on public.waitlist_entries
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.waitlist_entries enable row level security;

/**
 * Policy waitlist_entries_select_own: a person reads their own entry.
 * Why: the holding page and Download my data show it. Nobody writes the table directly: the
 * sign-up, set_my_waitlist_interest() and the admin functions do.
 */
create policy waitlist_entries_select_own
  on public.waitlist_entries for select to authenticated
  using ((select auth.uid()) = user_id);

comment on policy waitlist_entries_select_own on public.waitlist_entries is
  'Allows a person to read their own waiting list entry (WAITLIST-1).';

/**
 * Policy waitlist_entries_select_staff: owner and admin, in a staff session, read every entry.
 * Why: Staff › Waitlist lists and counts the people waiting to let them in.
 */
create policy waitlist_entries_select_staff
  on public.waitlist_entries for select to authenticated
  using ((select public.staff_may('waitlist', 'view')));

comment on policy waitlist_entries_select_staff on public.waitlist_entries is
  'Allows owner and admin, in a staff session, to read every waiting list entry (WAITLIST-1).';

revoke all on public.waitlist_entries from anon, authenticated;
grant select on public.waitlist_entries to authenticated;  -- waitlist_entries_select_own, waitlist_entries_select_staff

/* ---------- Who may open Staff › Waitlist ---------- */

-- Owner and admin let people in (architecture 1.8.3: like invites, S1-E11-17).
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('waitlist', 'owner', 'act', null),
  ('waitlist', 'admin', 'act', null)
on conflict (role, area) do nothing;

/* ---------- Signing up ---------- */

/**
 * sign_up_waitlist_interest: the answer to "write, read or both" from the sign-up data.
 * Input: the sign-up data (->> 'waitlist_interest'). Returns: the answer, 'both' when none or
 *   an unknown one was sent (an older form).
 */
create function public.sign_up_waitlist_interest(sign_up_data jsonb)
returns public.waitlist_interest
language sql
immutable
set search_path = ''
as $$
  select case when sign_up_data ->> 'waitlist_interest' in ('write', 'read', 'both')
    then (sign_up_data ->> 'waitlist_interest')::public.waitlist_interest
    else 'both'::public.waitlist_interest end;
$$;

comment on function public.sign_up_waitlist_interest(jsonb) is
  'Internal: the sign-up''s "write, read or both" answer, both by default (WAITLIST-1).';
revoke execute on function public.sign_up_waitlist_interest(jsonb) from public, anon, authenticated;

/**
 * join_waitlist_at_sign_up: steps 5 and 6 of the sign-up while the waiting list is on.
 * Inputs: the new account and the sign-up data.
 * What it does: a code, when one was sent, is used as before and lets the person in at once;
 *   without one, the person waits. Either way they get an entry with their answer and the
 *   founding member badge, and the news opt-in when they ticked it and are 18 or over (Q50).
 * Errors: check_violation from use_sign_up_invite() for a code that doesn't work.
 */
create function public.join_waitlist_at_sign_up(new_user_id uuid, sign_up_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := nullif(btrim(coalesce(sign_up_data ->> 'invite_code', '')), '');
begin
  -- Step 1: a code still skips the queue (S1-E11-17, IDEAS-3c).
  if code is not null then
    perform public.use_sign_up_invite(code, new_user_id);
  end if;
  -- Step 2: the entry, already let in when a code was used.
  insert into public.waitlist_entries (user_id, interest, admitted_at, admitted_by_code)
  values (new_user_id, public.sign_up_waitlist_interest(sign_up_data),
    case when code is not null then now() end, code is not null);
  -- Step 3: the badge, and occasional news only for an adult who ticked it (Law 506/2004; Q50).
  update public.profiles set
    founding_member_since = now(),
    marketing_email_opt_in = coalesce(sign_up_data ->> 'news_emails', '') = 'true'
      and public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
        profiles.age_check_result, (now() at time zone 'Europe/Bucharest')::date) = '18_plus'
  where profiles.id = new_user_id;
end;
$$;

comment on function public.join_waitlist_at_sign_up(uuid, jsonb) is
  'Internal: puts a new account on the waiting list, or lets it in with a code; the badge and news opt-in (WAITLIST-1).';
revoke execute on function public.join_waitlist_at_sign_up(uuid, jsonb) from public, anon, authenticated;

/**
 * create_profile_from_sign_up: as before (S1-E2-01 onwards, MARKETS-1), with the waiting list.
 * Changed by WAITLIST-1, step 5: while the 'waitlist' flag is on, an invitation code is
 *   optional: with one the person is let in at once, without one they wait on the list
 *   (join_waitlist_at_sign_up()). With the flag off, an invite-only test still needs a code.
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

  -- Step 5: the waiting list (WAITLIST-1), else the invite while the test is invite only
  -- (S1-E11-17), after the profile so the invite's audit row can name the new account. A class
  -- link counts too, and joins the class (IDEAS-3c).
  if public.is_feature_enabled('waitlist') then
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

/* ---------- The gate ---------- */

/**
 * is_on_waitlist: whether someone's entry is still waiting for staff.
 * Input: the account. Returns: true while the entry has no admitted_at. Turning the flag off
 *   doesn't let anyone in: staff do that, so everyone gets the "You're in" email.
 */
create function public.is_on_waitlist(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.waitlist_entries
                 where waitlist_entries.user_id = target_user_id and waitlist_entries.admitted_at is null);
$$;

comment on function public.is_on_waitlist(uuid) is
  'Internal: true while the person''s waiting list entry waits for staff (WAITLIST-1).';
revoke execute on function public.is_on_waitlist(uuid) from public, anon, authenticated;

/**
 * account_state: as before (S1-E1-02 onwards, MARKETS-1); step 4b added by WAITLIST-1.
 * Step 4b: a confirmed account still on the waiting list is 'waitlisted': it signs in to the
 *   holding page and can't write, read or post. It comes before the age check and a parent's
 *   consent, so nobody is asked for either until they are let in.
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

  -- Step 4b: still waiting for a place (WAITLIST-1).
  if public.is_on_waitlist(target_user_id) then
    return 'waitlisted';
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
 * may_change_own_avatar: as before (an active member or a staff account), and someone on the
 * waiting list, who picks an avatar on the holding page (WAITLIST-1). Built avatars only, never a
 * picture, so nothing needs the picture check.
 */
create or replace function public.may_change_own_avatar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.account_state((select auth.uid())) in ('active', 'staff_account', 'waitlisted'),
    false
  );
$$;

/* ---------- The holding page ---------- */

/**
 * my_waitlist: the caller's place on the waiting list, for the holding page.
 * Returns: {on_list: false} when the caller has no entry; otherwise {on_list, waiting, interest,
 *   joined_at, admitted_at}. No position in the queue: staff let people in by interest and
 *   country, so a number would mislead.
 * Errors: insufficient_privilege when signed out.
 */
create function public.my_waitlist()
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
  return jsonb_build_object('on_list', true, 'waiting', entry.admitted_at is null,
    'interest', entry.interest, 'joined_at', entry.joined_at, 'admitted_at', entry.admitted_at);
end;
$$;

comment on function public.my_waitlist() is
  'The caller''s waiting list entry for the holding page; never a queue position (WAITLIST-1).';
revoke execute on function public.my_waitlist() from public, anon;
grant execute on function public.my_waitlist() to authenticated;

/**
 * set_my_waitlist_interest: the caller changes their answer to "write, read or both".
 * Input: wanted (write, read or both). Returns: nothing.
 * Errors: insufficient_privilege when signed out; check_violation (hint 'not_on_list') without
 *   an entry still waiting.
 */
create function public.set_my_waitlist_interest(wanted public.waitlist_interest)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your answer.' using errcode = 'insufficient_privilege';
  end if;
  update public.waitlist_entries set interest = coalesce(wanted, 'both')
  where waitlist_entries.user_id = (select auth.uid()) and waitlist_entries.admitted_at is null;
  if not found then
    raise exception 'You''re not waiting on the list.' using errcode = 'check_violation', hint = 'not_on_list';
  end if;
end;
$$;

comment on function public.set_my_waitlist_interest(public.waitlist_interest) is
  'The caller changes their "write, read or both" answer while they wait (WAITLIST-1).';
revoke execute on function public.set_my_waitlist_interest(public.waitlist_interest) from public, anon;
grant execute on function public.set_my_waitlist_interest(public.waitlist_interest) to authenticated;

/* ---------- Staff › Waitlist ---------- */

/**
 * waitlist_interest_matches: whether an answer fits a staff filter.
 * Inputs: the answer; the filter ('write' means write or both, 'read' read or both, null all).
 * Returns: true when it fits. Why: "writers first" includes people who want to do both.
 */
create function public.waitlist_interest_matches(answer public.waitlist_interest, wanted text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select wanted is null or answer::text = wanted or answer = 'both';
$$;

comment on function public.waitlist_interest_matches(public.waitlist_interest, text) is
  'Internal: an answer fits a filter; write and read both include both (WAITLIST-1).';
revoke execute on function public.waitlist_interest_matches(public.waitlist_interest, text) from public, anon, authenticated;

/**
 * admin_waitlist: the people still waiting, with counts, for Staff › Waitlist.
 * Inputs: wanted_interest ('write', 'read' or null for everyone); wanted_country (two letters or
 *   null); page_size (1 to 100, default 50); page_offset.
 * Returns: {counts: {waiting, write, read, both, admitted}, countries: [{country, waiting}],
 *   matching, people: [{entry_id, handle, display_name, interest, country, joined_at,
 *   email_confirmed}]}, oldest first. Never the user ID or the email.
 * Errors: insufficient_privilege outside owner and admin in a staff session.
 */
create function public.admin_waitlist(
  wanted_interest text default null,
  wanted_country text default null,
  page_size integer default 50,
  page_offset integer default 0
)
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
  -- Step 2: the counts, the countries, and one page of the people who fit the filters.
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
        'waiting', count(*) filter (where entries.admitted_at is null),
        'write', count(*) filter (where entries.admitted_at is null and entries.interest = 'write'),
        'read', count(*) filter (where entries.admitted_at is null and entries.interest = 'read'),
        'both', count(*) filter (where entries.admitted_at is null and entries.interest = 'both'),
        'admitted', count(*) filter (where entries.admitted_at is not null))
      from public.waitlist_entries as entries),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('country', listed.country, 'waiting', listed.waiting)
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
              'joined_at', entries.joined_at, 'email_confirmed', users.email_confirmed_at is not null) as row_json
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

comment on function public.admin_waitlist(text, text, integer, integer) is
  'Staff › Waitlist: the people waiting, by interest and country, with counts; never the user ID or email (WAITLIST-1).';
revoke execute on function public.admin_waitlist(text, text, integer, integer) from public, anon;
grant execute on function public.admin_waitlist(text, text, integer, integer) to authenticated;

/**
 * admit_waitlist_entry: lets one waiting person in, tells them and writes the audit row.
 * Inputs: the entry; why ('one_by_one' or 'wave', for the audit row).
 * Returns: true when the entry was waiting and is now let in; false when it wasn't waiting.
 * The notice: 'waitlist_admitted', always emailed (email_delivery_for()), with a link to sign
 *   in and no code.
 */
create function public.admit_waitlist_entry(target_entry_id uuid, how text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.waitlist_entries;
begin
  -- Step 1: only an entry still waiting, for a live account.
  update public.waitlist_entries set admitted_at = now()
  where waitlist_entries.id = target_entry_id and waitlist_entries.admitted_at is null
    and exists (select 1 from public.profiles
                where profiles.id = waitlist_entries.user_id and profiles.deleted_at is null)
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

comment on function public.admit_waitlist_entry(uuid, text) is
  'Internal: lets one waiting person in, sends "You''re in" and writes the audit row (WAITLIST-1).';
revoke execute on function public.admit_waitlist_entry(uuid, text) from public, anon, authenticated;

/**
 * admin_admit_from_waitlist: staff let the people they ticked in.
 * Input: entry_ids (at most 100). Returns: how many were let in (people already in or gone are
 *   skipped).
 * Errors: insufficient_privilege outside owner and admin in a staff session; check_violation for
 *   an empty list or more than 100.
 */
create function public.admin_admit_from_waitlist(entry_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted uuid;
  admitted integer := 0;
begin
  -- Step 1: owner and admin only, in a staff session.
  if not public.staff_may('waitlist', 'act') then
    raise exception 'Only an owner or admin can let people in.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(cardinality(entry_ids), 0) not between 1 and 100 then
    raise exception 'Tick 1 to 100 people.' using errcode = 'check_violation', hint = 'pick_people';
  end if;
  -- Step 2: each person, in the order ticked.
  foreach wanted in array entry_ids loop
    if public.admit_waitlist_entry(wanted, 'one_by_one') then
      admitted := admitted + 1;
    end if;
  end loop;
  return admitted;
end;
$$;

comment on function public.admin_admit_from_waitlist(uuid[]) is
  'Staff › Waitlist: lets the ticked people in and emails each "You''re in"; audited (WAITLIST-1).';
revoke execute on function public.admin_admit_from_waitlist(uuid[]) from public, anon;
grant execute on function public.admin_admit_from_waitlist(uuid[]) to authenticated;

/**
 * admin_admit_waitlist_wave: staff let the next people in, oldest first, by interest and country.
 * Inputs: wanted_interest ('write' = write or both, 'read' = read or both, null = everyone);
 *   wanted_country (two letters or null); how_many (1 to 1000).
 * Returns: how many were let in. Only people who confirmed their email are taken, because only
 *   they can sign in and get the email.
 * Errors: insufficient_privilege outside owner and admin in a staff session; check_violation for
 *   how_many outside 1 to 1000.
 */
create function public.admin_admit_waitlist_wave(
  wanted_interest text,
  wanted_country text,
  how_many integer
)
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
  -- Step 2: the oldest confirmed people who fit, each let in and told.
  for next_entry in
    select entries.id from public.waitlist_entries as entries
    join public.profiles on profiles.id = entries.user_id
    join auth.users on users.id = entries.user_id
    where entries.admitted_at is null and profiles.deleted_at is null and users.email_confirmed_at is not null
      and public.waitlist_interest_matches(entries.interest, interest_filter)
      and (country_filter is null or profiles.country_code = country_filter)
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

comment on function public.admin_admit_waitlist_wave(text, text, integer) is
  'Staff › Waitlist: lets the next confirmed people in, oldest first, by interest and country; audited (WAITLIST-1).';
revoke execute on function public.admin_admit_waitlist_wave(text, text, integer) from public, anon;
grant execute on function public.admin_admit_waitlist_wave(text, text, integer) to authenticated;

/* ---------- The "You're in" email ---------- */

/**
 * email_delivery_for: as in ADMIN-2e2a, and the "You're in" notice is always sent: it is how the
 * person learns their account is open (WAITLIST-1).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived',
                  'data_request_confirm', 'data_request_extended', 'data_request_copy_ready',
                  'picture_opened_by_staff', 'waitlist_admitted') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;

/**
 * notification_category: as in LOOK-4c, and the "You're in" notice is filed with the other
 * notices from the team ('staff').
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
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    when 'waitlist_admitted' then 'staff'
    else 'replies'
  end;
$$;

/* ---------- Download my data, the badge and the dashboard ---------- */

/**
 * data_export_tables: as in IDEAS-3d, with the person's waiting list entry (WAITLIST-1).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;
/**
 * account_deletion_rules: as in IDEAS-3d, and the waiting list entry is deleted with the
 * account (WAITLIST-1).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('contest_entries', 'delete', 1, null),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null);
$$;

/**
 * staff_dashboard: as in DASH-1, with the number of people waiting on the list for owner and
 * admin (WAITLIST-1).
 */
create or replace function public.staff_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  numbers jsonb := '{}'::jsonb;
  may_see_safeguarding boolean := public.staff_may('safeguarding', 'view');
begin
  -- Step 1: only a live staff session gets numbers (architecture 1.8.1).
  if not public.is_staff_session() then
    raise exception 'Only staff in a staff session can see the dashboard.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: moderation: reports waiting for a decision, those past their deadline, and the
  -- pictures waiting for a reviewer (the same cases admin_pictures_to_check() lists, counted
  -- here without opening any file).
  if public.staff_may('moderation', 'view') then
    numbers := numbers || jsonb_build_object('moderation', jsonb_build_object(
      'waiting', (select count(*) from public.cases
        where cases.status = 'open' and cases.item_type <> 'picture'
          and (not cases.is_safeguarding or may_see_safeguarding)),
      'overdue', (select count(*) from public.cases
        where cases.status = 'open' and cases.item_type <> 'picture' and cases.deadline_at < now()
          and (not cases.is_safeguarding or may_see_safeguarding)),
      'pictures', (select count(*) from public.cases
        join public.picture_checks as picture on picture.id = cases.item_id
        where cases.item_type = 'picture' and cases.status = 'open' and not cases.is_safeguarding
          and cases.source in ('picture_review', 'picture_check') and picture.status = 'held')));
  end if;

  -- Step 3: appeals waiting for a second moderator (S1-E10-07).
  if public.staff_may('appeals', 'view') then
    numbers := numbers || jsonb_build_object('appeals', jsonb_build_object(
      'open', (select count(*) from public.appeals where appeals.status = 'open')));
  end if;

  -- Step 4: teacher checks waiting for staff (S1-E2-11).
  if public.staff_may('schools', 'view') then
    numbers := numbers || jsonb_build_object('schools', jsonb_build_object(
      'teacherChecks', (select count(*) from public.teacher_checks
        where teacher_checks.status = 'waiting_for_staff')));
  end if;

  -- Step 5: data requests still open, and those past their legal deadline (GDPR art. 12(3):
  -- one month, extendable by two; S1-E11-09).
  if public.staff_may('data_requests', 'view') then
    numbers := numbers || jsonb_build_object('dataRequests', jsonb_build_object(
      'open', (select count(*) from public.data_requests where data_requests.state = 'open'),
      'overdue', (select count(*) from public.data_requests
        where data_requests.state = 'open'
          and coalesce(data_requests.extended_to, data_requests.due_on) < current_date)));
  end if;

  -- Step 6: support tickets that still need the team (new or open; S1-E11-13).
  if public.staff_may('support_tickets', 'view') then
    numbers := numbers || jsonb_build_object('supportTickets', jsonb_build_object(
      'open', (select count(*) from public.support_tickets
        where support_tickets.status in ('new', 'open'))));
  end if;

  -- Step 7: sign-ups in the last 7 days, an aggregate the metrics area already shows (S1-E11-04).
  if public.staff_may('metrics', 'view') then
    numbers := numbers || jsonb_build_object('metrics', jsonb_build_object(
      'signUpsThisWeek', (select count(*) from public.profiles
        where profiles.created_at > now() - interval '7 days' and profiles.deleted_at is null)));
  end if;

  -- Step 8: calls that failed on our side or the network, and browser crashes, in the last
  -- 24 hours (LOGS-1). A refused call (client_error) is often the rules working, so it isn't
  -- counted as a failure here.
  if public.staff_may('call_log', 'view') then
    numbers := numbers || jsonb_build_object('logs', jsonb_build_object(
      'failedCalls', (select count(*) from public.call_log
        where call_log.created_at > now() - interval '24 hours'
          and call_log.outcome in ('server_error', 'network_error')),
      'crashes', (select count(*) from public.client_errors
        where client_errors.created_at > now() - interval '24 hours')));
  end if;

  -- Step 9: people still waiting on the list (WAITLIST-1).
  if public.staff_may('waitlist', 'view') then
    numbers := numbers || jsonb_build_object('waitlist', jsonb_build_object(
      'waiting', (select count(*) from public.waitlist_entries
        join public.profiles on profiles.id = waitlist_entries.user_id
        where waitlist_entries.admitted_at is null and profiles.deleted_at is null)));
  end if;

  return numbers;
end;
$$;
/**
 * get_writer_profile: as in S1-E13-01 and QA-2a, and whether the writer is a founding member, a
 * public badge like Teacher (WAITLIST-1).
 */
create or replace function public.get_writer_profile(wanted_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writer public.profiles;
  is_me boolean;
  i_blocked boolean;
  is_open boolean;
  story_cards jsonb;
begin
  -- Step 1: the live profile behind the username.
  select * into writer from public.profile_for_handle(wanted_handle);
  if not found then
    return null;
  end if;
  is_me := caller_id is not null and caller_id = writer.id;
  -- Step 2: hidden or removed by a moderator: gone for everyone but its owner.
  if not is_me and public.is_moderated_away('profile', writer.id) then
    return null;
  end if;
  -- Step 3: this person blocks the caller: as if there were no such profile.
  if exists (select 1 from public.blocks where blocks.user_id = writer.id and blocks.blocked_user_id = caller_id) then
    return null;
  end if;
  -- Step 4: the caller blocks this person: the header only, so they can unblock.
  i_blocked := exists (select 1 from public.blocks where blocks.user_id = caller_id and blocks.blocked_user_id = writer.id);
  story_cards := case when i_blocked then '[]'::jsonb else public.profile_story_cards(writer.id, is_me) end;
  -- Step 5: the owner's privacy choice (S1-E13-01).
  is_open := public.profile_is_open_to(writer, caller_id);
  -- Step 6: the answer, from the public columns only; can_message never says why (S1-E9-03).
  return jsonb_build_object(
    'handle', writer.handle,
    'display_name', public.display_name(writer.handle, writer.pen_name),
    'pen_name', nullif(btrim(coalesce(writer.pen_name, '')), ''),
    'bio', case when is_open then writer.bio else '' end,
    'joined_at', case when is_open then writer.created_at end,
    'is_limited', not is_open,
    'is_me', is_me,
    'i_blocked', i_blocked,
    'is_teacher', writer.teacher_badge_since is not null,
    'is_founding_member', writer.founding_member_since is not null,
    'can_message', case when caller_id is null or is_me then null
                        else public.can_message(caller_id, writer.id) end,
    'library_open', not i_blocked and public.library_is_open_to(writer, caller_id),
    'library_audience', case when is_me then writer.library_visible_to end,
    'counts', jsonb_build_object(
      'stories', jsonb_array_length(story_cards),
      'chapters', (select coalesce(sum((story ->> 'chapter_count')::integer), 0) from jsonb_array_elements(story_cards) as story),
      'reads', (select coalesce(sum(chapter_reads.total), 0)
        from public.chapter_reads
        join public.chapters on chapters.id = chapter_reads.chapter_id
        where chapters.story_id in (select (story ->> 'id')::uuid from jsonb_array_elements(story_cards) as story)
          and public.chapter_is_readable(chapters.id))),
    'stories', story_cards
  );
end;
$$;
