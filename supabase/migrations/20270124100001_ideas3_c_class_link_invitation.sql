-- Migration: the class link stands in for the platform invitation (bundle 14d IDEAS-3, part c;
-- idea IDEA-20261102-4).
--
-- What it changes: while sign-up is invite only (the invite_only flag, S1-E11-17), a working class
-- code now opens sign-up too. The student signs up through /join/<code> and is a member of the
-- class when the account is made, so they need no second invitation. A class code that has ended,
-- is used up or belongs to a locked or removed class does not open sign-up: the page asks for a
-- normal invitation instead (criterion 2).
-- Why it is safe: a class code is already limited (places and an end date), logged and made only
-- by the teacher who runs the class (S1-E8-11), so it can open the door as safely as a platform
-- invite. Every other sign-up rule (age, market, username, terms) still runs first. While the
-- adults_only flag is on, only adults can sign up at all; the class's own age rules apply as before.
-- No new table, column or policy.
-- Called by: the sign-up trigger (create_profile_from_sign_up()) and check_invite() from the
-- sign-up page (src/features/auth/api/invites.ts).

/* ---------- 1. Which codes open sign-up ---------- */

/**
 * class_invite_opens_sign_up: whether a class code may stand in for a platform invitation now.
 * Input: code. Returns: true while the code works (not revoked, not past its date, a place left)
 *   and its class is neither locked nor removed by moderators; false otherwise, unknown codes too.
 * Internal: check_invite() and use_sign_up_invite().
 */
create or replace function public.class_invite_opens_sign_up(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select found.revoked_at is null and found.expires_at > now() and found.use_count < found.max_uses
      and not public.is_moderated_away('space', spaces.id)
      and not public.space_is_locked(spaces)
    from (select (public.class_invite_row(code)).*) as found
    join public.spaces on spaces.id = found.space_id
  ), false);
$$;
comment on function public.class_invite_opens_sign_up(text) is
  'Internal: whether a class code may open invite-only sign-up now (IDEAS-3c).';
revoke execute on function public.class_invite_opens_sign_up(text) from public, anon, authenticated;

/**
 * check_invite: as in S1-E2-01, and a working class code counts as a valid invitation (IDEAS-3c).
 * Input: code, as typed or from the /join/<code> link. Returns: 'valid', 'ended' or 'unknown';
 *   never the invite itself, its class or how many places are left.
 * Who may call it: anyone (the sign-up page, signed out).
 */
create or replace function public.check_invite(code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    -- Step 1: a platform invite, as before.
    (
      select case
        when invites.revoked_at is not null
          or invites.expires_at <= now()
          or invites.use_count >= invites.max_uses then 'ended'
        else 'valid'
      end
      from public.invites
      where invites.code_hash = public.invite_code_hash(code) and invites.purpose = 'platform'
    ),
    -- Step 2: otherwise a class code, read the way the "Join a class" page reads it, plus a
    -- locked class counting as ended (nobody joins a locked class, S1-E8-11 criterion 8).
    (
      select case
        when public.class_invite_opens_sign_up(code) then 'valid'
        else 'ended'
      end
      from public.invites
      where invites.code_hash = public.invite_code_hash(code) and invites.purpose = 'class_space'
    ),
    'unknown'
  );
$$;
comment on function public.check_invite(text) is
  'Answers valid, ended or unknown for a platform invite or a class code; never the invite itself (S1-E2-01, IDEAS-3c).';
revoke execute on function public.check_invite(text) from public;
grant execute on function public.check_invite(text) to anon, authenticated;

/* ---------- 2. Using the code at sign-up ---------- */

/**
 * use_sign_up_invite: takes one place on the code a new account signed up with.
 * Inputs: code; new_user_id, the account being made. Returns: nothing.
 * What it does: a platform invite goes through use_platform_invite() as before (S1-E11-17). A
 *   class code takes one of the class's places and makes the new account a member of the class
 *   at once, with a "member joined" row in the class's log, as joining from the page does
 *   (join_class_space()), and an "invite.redeemed" row in the audit log.
 * Errors: check_violation 'This invitation is not valid any more.' when the code is unknown,
 *   ended or used up, or its class is locked or removed; the sign-up transaction then leaves no
 *   account behind. The place is counted and checked in one statement, so two students can never
 *   both take the last place.
 * Internal: create_profile_from_sign_up().
 */
create or replace function public.use_sign_up_invite(code text, new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  used public.invites;
begin
  -- Step 1: a platform invite is used the way it always was.
  if exists (select 1 from public.invites
             where invites.code_hash = public.invite_code_hash(code) and invites.purpose = 'platform') then
    perform public.use_platform_invite(code, new_user_id);
    return;
  end if;
  -- Step 2: otherwise only a working class code, in a class that is open, will do.
  if not public.class_invite_opens_sign_up(code) then
    raise exception 'This invitation is not valid any more.' using errcode = 'check_violation';
  end if;
  update public.invites set use_count = use_count + 1
  where invites.code_hash = public.invite_code_hash(code) and invites.purpose = 'class_space'
    and invites.revoked_at is null and invites.expires_at > now() and invites.use_count < invites.max_uses
  returning * into used;
  if used.id is null then
    raise exception 'This invitation is not valid any more.' using errcode = 'check_violation';
  end if;
  -- Step 3: a member of the class straight away, logged as joining with the code is.
  insert into public.space_members (user_id, space_id, status, joined_at)
  values (new_user_id, used.space_id, 'active', now())
  on conflict (space_id, user_id) do update set status = 'active', joined_at = now();
  insert into public.space_moderation_log (user_id, space_id, action, target_user_id, details, by_platform)
  values (new_user_id, used.space_id, 'member_joined', new_user_id,
          jsonb_build_object('at_sign_up', true), false);
  -- Step 4: the audit log names the code that let the account in, as for a platform invite.
  insert into public.audit_log (user_id, actor, action, target_type, target_id, target_user_id, after_values)
  values (new_user_id, 'person', 'invite.redeemed', 'invites', used.id::text, used.user_id,
          jsonb_build_object('purpose', 'class_space', 'place', used.use_count, 'admits', used.max_uses));
end;
$$;
comment on function public.use_sign_up_invite(text, uuid) is
  'Internal: uses a platform invite, or a class code that also joins the class, at sign-up (S1-E11-17, IDEAS-3c).';
revoke execute on function public.use_sign_up_invite(text, uuid) from public, anon, authenticated;

/* ---------- 3. The sign-up trigger's profile step ---------- */

/**
 * create_profile_from_sign_up: as in ADMIN-2 part f2, and step 5 takes a class code as well as a
 *   platform invite (use_sign_up_invite(), IDEAS-3c). Inputs, return and callers are unchanged.
 */
create or replace function public.create_profile_from_sign_up(new_user_id uuid, sign_up_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_locale text := sign_up_data ->> 'locale';
  birth_year smallint;
  birth_month smallint;
  country text;
  chosen_handle text;
  outcome text;
begin
  -- Step 1: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 2: the country from the signed token, and the market rules (S1-E2-10).
  country := public.verified_signup_country(sign_up_data ->> 'signup_context');
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 3: the username chosen on the form, checked by the same rules as setup (S1-E2-04).
  chosen_handle := public.sign_up_handle(sign_up_data);

  -- Step 4: the profile, with the form's language, the country and the username.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code, handle)
  values (
    new_user_id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country,
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

comment on function public.create_profile_from_sign_up(uuid, jsonb) is
  'Internal: the sign-up rules and the new profile and consents, then the scrambled IP and the returning-user check (S1-E2-01, 02, 04, 10, S1-E11-17; shared since S1-E2-09; ADMIN-2 part f2; class codes IDEAS-3c).';
revoke execute on function public.create_profile_from_sign_up(uuid, jsonb) from public, anon, authenticated;
