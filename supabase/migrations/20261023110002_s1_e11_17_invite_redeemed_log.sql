-- The invite log writes its own rows (story S1-E11-17; CTO's answer of 24 Oct 2026: "don't write
-- it on behalf of the admin").
--
-- What it changes:
--   audit_log.actor          new: 'person' (user_id is who acted) or 'system' (nobody acted: the
--                            platform did something on its own, so user_id is empty). A check ties
--                            the two together, so a person's row can never lose its user ID.
--   audit_log_row            the screens' row gains the actor and the actor's short user ID, so a
--                            new account without a username yet, and the system, still show.
--   audit_log_rows()         reads system rows too (left join on the actor).
--   use_platform_invite()    now takes the new account's user ID and writes:
--                              invite.redeemed  actor = the new account (user ID only, never the
--                                               email), target = the invite;
--                              invite.used_up   when that place was the last one, actor = system.
--   handle_new_auth_user()   uses the invite after the profile exists, because an audit row's
--                            user_id points at profiles (same checks, same transaction).
-- Before this, invite.used_up was written on behalf of the invite's maker, which made it look as if
-- the admin had acted.

/* ---------- 1. Who acted: a person or the system ---------- */

create type public.audit_actor as enum ('person', 'system');
comment on type public.audit_actor is
  'Who an audit row says acted: a person (user_id) or the platform itself (no user_id) (S1-E11-17).';

-- Adding a column with a default rewrites nothing and fires no row trigger, so the append-only
-- triggers on audit_log are untouched; every existing row is a person's.
alter table public.audit_log
  add column actor public.audit_actor not null default 'person';
alter table public.audit_log
  alter column user_id drop not null;
alter table public.audit_log
  add constraint audit_log_actor_matches_user_id check ((actor = 'system') = (user_id is null));
comment on column public.audit_log.actor is
  'person: user_id acted. system: the platform acted on its own and user_id is empty (S1-E11-17).';
comment on column public.audit_log.user_id is
  'Who acted: a staff member, or a member for their own actions (invite.redeemed). Empty only on system rows.';

/* ---------- 2. The screens' row ---------- */

alter type public.audit_log_row add attribute actor public.audit_actor;
alter type public.audit_log_row add attribute actor_user_id_short text;

/**
 * audit_log_rows: the shared query behind the search and the export (S1-E11-01), now with system
 *   rows and the actor's short user ID (S1-E11-17).
 * Inputs: action_prefix (null for every action; 'staff.' matches every staff action),
 *   staff_handle (the person who acted, null for anyone; system rows never match a username),
 *   target_user_id (whose thing it was, null for any), from_date and to_date (inclusive, null for
 *   no limit), row_limit, row_offset.
 * Returns: the newest rows first, with usernames instead of raw IDs where a username exists. User
 *   IDs are shortened to their first 8 characters: staff see an ID short with a copy button, never
 *   in full on a list (architecture 1.6).
 * Internal: admin_search_audit_log() and admin_export_audit_log() check the role, then call it.
 */
create or replace function public.audit_log_rows(
  action_prefix text,
  staff_handle text,
  target_user_id uuid,
  from_date date,
  to_date date,
  row_limit integer,
  row_offset integer
)
returns setof public.audit_log_row
language sql
stable
security definer
set search_path = ''
as $$
  select
    log.id,
    log.created_at,
    actor.handle,
    log.action,
    log.target_type,
    log.target_id,
    target.handle,
    left(log.target_user_id::text, 8),
    log.reason,
    log.before_values,
    log.after_values,
    log.actor,
    left(log.user_id::text, 8)
  from public.audit_log as log
  -- A left join, because a system row has nobody behind it.
  left join public.profiles as actor on actor.id = log.user_id
  left join public.profiles as target on target.id = log.target_user_id
  where (action_prefix is null or log.action like action_prefix || '%')
    and (staff_handle is null
         or actor.handle_skeleton = public.username_skeleton(btrim(staff_handle, ' @')))
    and (target_user_id is null or log.target_user_id = target_user_id)
    and (from_date is null or log.created_at >= from_date::timestamptz)
    and (to_date is null or log.created_at < (to_date + 1)::timestamptz)
  order by log.created_at desc, log.id desc
  limit row_limit offset row_offset;
$$;

comment on function public.audit_log_rows(text, text, uuid, date, date, integer, integer) is
  'Internal: the audit log search, newest first, with usernames instead of IDs and system rows (S1-E11-01, S1-E11-17).';

/* ---------- 3. Using a place on an invite ---------- */

drop function public.use_platform_invite(text);

/**
 * use_platform_invite: takes one place on a platform invite for a new account, or refuses
 *   (S1-E2-01), and logs it in the account's own name (S1-E11-17).
 * Inputs: code (as typed or from the link), new_user_id (the account being created; its profile
 *   row must already exist, because audit rows point at profiles).
 * Returns: nothing.
 * Errors: raises check_violation when the code is unknown, expired, revoked or used up. The
 *   update counts and checks in one statement, so two people can never both take the last place.
 * Audit rows (CTO, 24 Oct 2026): invite.redeemed with the new account as actor (its user ID only,
 *   never its email) and the invite as target; when that was the last place, invite.used_up with
 *   the system as actor, because nobody chose to close the invite.
 * Where it fits: the sign-up trigger, inside the transaction that creates the account, so a
 *   refused invite leaves no account and no audit row behind.
 */
create function public.use_platform_invite(code text, new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  used public.invites;
begin
  -- Step 1: take a place, only if the invite is a live platform invite with a place left.
  update public.invites
    set use_count = use_count + 1
    where invites.code_hash = public.invite_code_hash(code)
      and invites.purpose = 'platform'
      and invites.revoked_at is null
      and invites.expires_at > now()
      and invites.use_count < invites.max_uses
    returning * into used;
  if used.id is null then
    raise exception 'This invitation is not valid any more.' using errcode = 'check_violation';
  end if;

  -- Step 2: the new account says it used a place. target_user_id is whose invite it is.
  insert into public.audit_log (user_id, actor, action, target_type, target_id, target_user_id, after_values)
  values (
    new_user_id, 'person', 'invite.redeemed', 'invites', used.id::text, used.user_id,
    jsonb_build_object('place', used.use_count, 'admits', used.max_uses)
  );

  -- Step 3: the last place closes the invite; nobody chose that, so the system is the actor.
  if used.use_count >= used.max_uses then
    insert into public.audit_log (user_id, actor, action, target_type, target_id, target_user_id, reason, after_values)
    values (
      null, 'system', 'invite.used_up', 'invites', used.id::text, used.user_id,
      'Automatic: the last place was taken at sign-up.',
      jsonb_build_object('admits', used.max_uses, 'note', used.note)
    );
  end if;
end;
$$;

comment on function public.use_platform_invite(text, uuid) is
  'Internal: takes one place on a platform invite in the sign-up transaction, or refuses; logs invite.redeemed and invite.used_up (S1-E2-01, S1-E11-17).';
revoke execute on function public.use_platform_invite(text, uuid) from public, anon, authenticated;

/* ---------- 4. The sign-up trigger uses the invite once the profile exists ---------- */

/**
 * handle_new_auth_user: checks a sign-up and creates the profile and consents, or refuses it all
 *   (S1-E2-01, S1-E2-02, S1-E2-10). Same checks as before; the invite step moved after the
 *   profile so its audit row can name the new account (S1-E11-17).
 * Input: the new auth.users row. Returns: it, unchanged.
 * Errors: check_violation for a refused invite, age or market; anything raised undoes the whole
 *   sign-up, so nothing is kept.
 * Where it fits: the trigger on auth.users that Supabase Auth fires at sign-up.
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
  outcome text;
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 3: the country from the signed token, and the market rules (S1-E2-10).
  country := public.verified_signup_country(sign_up_data ->> 'signup_context');
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 4: the profile, with the language the form was in and the country.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code)
  values (
    new.id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country
  );

  -- Step 5: the March test is invite only (decided 17 Oct 2026, 12:44). A refused invite still
  -- undoes everything above, because it is the same transaction.
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code', new.id);
  end if;

  -- Step 6: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new.id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new.id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: checks a sign-up (age, market, invite) and creates the profile and consents, or refuses it all (S1-E2-01, 02, 10, S1-E11-17).';
