-- Migration: the optional birthday keeps the month only (QA-7, finding P1; CTO decision,
-- 6 Nov 2026, under Robert's standing go-ahead of 5 Nov 2026, 21:10).
--
-- Why: S1-E2-12 stored an optional birthday day and month on the same profile row as the year of
-- birth, so together they made a full date of birth, which CLAUDE.md rule 5 forbids ("store no
-- full dates of birth"). Moving the day to another table would still keep the full date in our
-- database, so the day goes: the greeting becomes "Happy birthday month" for the whole month.
-- It can be undone by a later migration that adds the column back (nothing reads it today, and
-- staging holds only synthetic accounts, so no real day is lost).
--
-- What it changes:
--   profiles.birthday_day                dropped (with its "real day" check)
--   check_birthday(month)                 replaces check_birthday(month, day)
--   set_my_birthday(month)                replaces set_my_birthday(month, day)
--   admin_set_birthday(user, reason, month)  replaces the version with a day
--   greeting_for(month, joined, day)      'birthday_month', 'anniversary' or null; no 'birthday'
--   my_greeting()                         calls the new greeting_for()
--   erase_closed_account()                no longer clears the dropped column
-- Who calls them: Settings › Birthday, the staff "Correct birthday" action and the Discover
--   greeting line (src/features/account, src/features/staff, src/features/discovery).

/* ---------- Step 1: the functions that read or write the day go first ---------- */

drop function public.my_greeting();
drop function public.greeting_for(integer, integer, timestamptz, date);
drop function public.set_my_birthday(integer, integer);
drop function public.admin_set_birthday(uuid, text, integer, integer);
drop function public.check_birthday(integer, integer);

/* ---------- Step 2: the column ---------- */

alter table public.profiles
  drop constraint profiles_birthday_is_a_real_day,
  drop column birthday_day;

comment on column public.profiles.birthday_month is
  'Optional birthday month (1 to 12), never with a day or a year, so it never makes a full date of birth with birth_year (CLAUDE.md rule 5); only the owner reads it (S1-E2-12; QA-7, 6 Nov 2026).';

/* ---------- Step 3: saving it ---------- */

/**
 * check_birthday: refuses a birthday month that isn't 1 to 12.
 * Inputs: wanted_month (null means "no birthday", which is fine).
 * Errors: check_violation (hint birthday_invalid). Internal.
 */
create function public.check_birthday(wanted_month integer)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if wanted_month is not null and wanted_month not between 1 and 12 then
    raise exception 'That isn''t a real month.' using errcode = 'check_violation', hint = 'birthday_invalid';
  end if;
end;
$$;

comment on function public.check_birthday(integer) is
  'Internal: refuses a birthday month that isn''t 1 to 12 (S1-E2-12; QA-7).';
revoke execute on function public.check_birthday(integer) from public, anon, authenticated;

/**
 * set_my_birthday: the signed-in person saves or clears their own optional birthday month.
 * Inputs: wanted_month (1 to 12, or null/left out to clear).
 * Returns: {"month": n|null}, what is saved now.
 * Errors: insufficient_privilege when signed out; check_violation (birthday_invalid).
 * Where it fits: Settings › Birthday (S1-E2-12). No account gate: it is a setting, not writing.
 */
create function public.set_my_birthday(wanted_month integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in person, and only a real month.
  if caller_id is null then
    raise exception 'Sign in to save a birthday.' using errcode = 'insufficient_privilege';
  end if;
  perform public.check_birthday(wanted_month);
  -- Step 2: save it on their own row.
  update public.profiles set birthday_month = wanted_month where profiles.id = caller_id;
  return jsonb_build_object('month', wanted_month);
end;
$$;

comment on function public.set_my_birthday(integer) is
  'Saves or clears the caller''s own optional birthday month (never a day or a year) (S1-E2-12; QA-7).';
revoke execute on function public.set_my_birthday(integer) from public, anon;
grant execute on function public.set_my_birthday(integer) to authenticated;

/**
 * admin_set_birthday: staff correct a birthday month the person says is wrong (S1-E2-12).
 * Inputs: target_user_id; reason_given (required); wanted_month (null or left out to clear).
 * Returns: true.
 * Errors: as require_account_action_allowed() (owner, admin or moderator; not one's own account;
 *   a reason; a live account); check_violation (birthday_invalid).
 * Logging: account.birthday_corrected with the before and after month, same transaction.
 */
create function public.admin_set_birthday(
  target_user_id uuid,
  reason_given text,
  wanted_month integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_month smallint;
begin
  -- Step 1: the shared account-action checks, then the month itself.
  perform public.require_account_action_allowed(target_user_id, reason_given);
  perform public.check_birthday(wanted_month);
  -- Step 2: the change, keeping the old value for the log.
  select profiles.birthday_month into before_month
    from public.profiles where profiles.id = target_user_id for update;
  update public.profiles set birthday_month = wanted_month where profiles.id = target_user_id;
  -- Step 3: the audit row, in the same transaction.
  perform public.log_staff_action(
    'account.birthday_corrected', 'profiles', target_user_id::text, target_user_id, btrim(reason_given),
    jsonb_build_object('birthday_month', before_month),
    jsonb_build_object('birthday_month', wanted_month)
  );
  return true;
end;
$$;

comment on function public.admin_set_birthday(uuid, text, integer) is
  'Staff correct an account''s optional birthday month on request, with a reason, logged (S1-E2-12; QA-7).';
revoke execute on function public.admin_set_birthday(uuid, text, integer) from public, anon;
grant execute on function public.admin_set_birthday(uuid, text, integer) to authenticated;

/* ---------- Step 4: the greeting ---------- */

/**
 * greeting_for: what the greeting line says for one account on one day (Romanian date).
 * Inputs: the birthday month, when the account joined, and the day to greet on.
 * Returns: 'birthday_month' during the birthday month, 'anniversary' in the month they joined
 *   from the first anniversary on, or null. The birthday month wins over the anniversary
 *   (S1-E2-13, proposal). Pure, so tests can pass any day. Internal.
 */
create function public.greeting_for(
  birthday_month integer,
  joined_at timestamptz,
  greeting_day date
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  joined_day date := (joined_at at time zone 'Europe/Bucharest')::date;
begin
  -- Step 1: the birthday month, all month.
  if birthday_month = extract(month from greeting_day) then
    return 'birthday_month';
  end if;
  -- Step 2: the joining anniversary, from the first full year on.
  if extract(month from joined_day) = extract(month from greeting_day)
     and extract(year from greeting_day) > extract(year from joined_day) then
    return 'anniversary';
  end if;
  return null;
end;
$$;

comment on function public.greeting_for(integer, timestamptz, date) is
  'Internal: birthday_month, anniversary or null for one account on one day (S1-E2-12, S1-E2-13; QA-7).';
revoke execute on function public.greeting_for(integer, timestamptz, date) from public, anon, authenticated;

/**
 * my_greeting: what the signed-in greeting line says today.
 * Returns: {"kind": 'birthday_month'|'anniversary'|null, "years": whole years since joining}.
 * Where it fits: the greeting line on Discover (S1-E2-12, S1-E2-13).
 */
create function public.my_greeting()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object(
       'kind', public.greeting_for(profiles.birthday_month, profiles.created_at,
         (now() at time zone 'Europe/Bucharest')::date),
       'years', extract(year from (now() at time zone 'Europe/Bucharest'))::integer
         - extract(year from (profiles.created_at at time zone 'Europe/Bucharest'))::integer)
     from public.profiles
     where profiles.id = (select auth.uid()) and profiles.deleted_at is null),
    jsonb_build_object('kind', null, 'years', 0));
$$;

comment on function public.my_greeting() is
  'What the signed-in greeting line says today: birthday_month, anniversary or null (S1-E2-12, S1-E2-13; QA-7).';
revoke execute on function public.my_greeting() from public, anon;
grant execute on function public.my_greeting() to authenticated;

/* ---------- Step 5: account erasure no longer names the dropped column ---------- */

/**
 * erase_closed_account: empties a deleted account's profile and login, keeping the user ID so it
 * is never reused (S1-E13-03). Unchanged apart from the dropped birthday_day column (QA-7).
 * Inputs: target_user_id. Returns: nothing. Internal.
 */
create or replace function public.erase_closed_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the profile: deleted, with its personal details gone.
  update public.profiles
  set deleted_at = coalesce(profiles.deleted_at, now()), birth_year = null, birth_month = null,
      age_checked_at = null, age_check_method = null, pen_name = null, pen_name_changed_at = null,
      bio = '', birthday_month = null, region_code = null, country_code = null,
      shows_online_status = false, last_active_at = null, marketing_email_opt_in = false,
      teacher_badge_since = null, messages_from = null, profile_visible_to = null
  where profiles.id = target_user_id;
  -- Step 2: the login: no email, no password, no passkeys, no way back in.
  delete from auth.refresh_tokens where refresh_tokens.user_id = target_user_id::text;
  delete from auth.sessions where sessions.user_id = target_user_id;
  delete from auth.identities where identities.user_id = target_user_id;
  delete from auth.webauthn_credentials where webauthn_credentials.user_id = target_user_id;
  update auth.users
  set email = target_user_id::text || '@deleted.invalid', encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = now() + interval '100 years'
  where users.id = target_user_id;
end;
$$;
