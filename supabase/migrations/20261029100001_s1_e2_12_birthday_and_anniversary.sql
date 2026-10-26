-- Migration: an optional birthday and the joining anniversary greeting (stories S1-E2-12 and
-- S1-E2-13; Robert, 25 Oct 2026, 07:07 to 07:11).
--
-- What it adds:
--   profiles.birthday_month, profiles.birthday_day   an optional birthday, never with a year
--   profiles_birth_year_never_changes                 a trigger: the year of birth set at sign-up
--                                                     is never changed, by anyone
--   set_my_birthday()      the owner saves or clears their own birthday (Settings)
--   admin_set_birthday()   staff correct it when the person asks (logged)
--   my_greeting()          what the signed-in greeting line says today
-- Who calls them: the Settings birthday panel, the staff account page and the greeting line on
--   Discover (src/features/account and src/features/discovery).
-- Personal data: the birthday is a day and a month, optional, read only by its owner (the
--   profiles_select_own policy) and by staff correcting it. CLAUDE.md rule 5 bans full dates of
--   birth; a day and month without the year is not one. The privacy notice gains a line and the
--   lawyer's list gains the point (S1-E2-12).

/* ---------- The columns ---------- */

alter table public.profiles
  add column birthday_month smallint check (birthday_month between 1 and 12),
  add column birthday_day smallint check (birthday_day between 1 and 31),
  -- A day only with a month, and only a day that month has (29 February is allowed: the year
  -- is never stored, so a leap-day birthday is greeted on 28 February in other years).
  add constraint profiles_birthday_is_a_real_day check (
    birthday_day is null
    or (birthday_month is not null
        and birthday_day <= (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[birthday_month])
  );
comment on column public.profiles.birthday_month is
  'Optional birthday month (1 to 12), never with a year; only the owner reads it (S1-E2-12, 25 Oct 2026).';
comment on column public.profiles.birthday_day is
  'Optional birthday day, only with a month; never with a year (S1-E2-12, 25 Oct 2026).';

/* ---------- The year of birth never changes ---------- */

/**
 * refuse_birth_year_change: the trigger behind "the year of birth set at sign-up is never
 * changed" (Robert, 25 Oct 2026, 07:10 to 07:11). Someone who entered it wrongly deletes the
 * account, waits for the deletion to finish and signs up again.
 * Inputs: the old and new profile rows. Returns: the new row, unchanged.
 * Errors: check_violation (hint birth_year_fixed) when an update changes birth_year.
 */
create or replace function public.refuse_birth_year_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_year is distinct from old.birth_year then
    raise exception 'The year of birth set at sign-up can''t be changed.'
      using errcode = 'check_violation', hint = 'birth_year_fixed';
  end if;
  return new;
end;
$$;

comment on function public.refuse_birth_year_change() is
  'Trigger: the year of birth set at sign-up never changes, for anyone (S1-E2-12; Robert, 25 Oct 2026).';
revoke execute on function public.refuse_birth_year_change() from public, anon, authenticated;

create trigger profiles_birth_year_never_changes
  before update of birth_year on public.profiles
  for each row execute function public.refuse_birth_year_change();

/* ---------- Saving it ---------- */

/**
 * check_birthday: refuses a birthday that isn't a real day and month.
 * Inputs: wanted_month and wanted_day (either may be null; a day needs a month).
 * Errors: check_violation (hint birthday_invalid). Internal.
 */
create or replace function public.check_birthday(wanted_month integer, wanted_day integer)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if (wanted_day is not null and wanted_month is null)
     or (wanted_month is not null and wanted_month not between 1 and 12)
     or (wanted_day is not null and (wanted_day < 1 or wanted_day >
         (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[wanted_month])) then
    raise exception 'That isn''t a real day and month.' using errcode = 'check_violation', hint = 'birthday_invalid';
  end if;
end;
$$;

comment on function public.check_birthday(integer, integer) is
  'Internal: refuses a birthday that isn''t a real day and month (S1-E2-12).';
revoke execute on function public.check_birthday(integer, integer) from public, anon, authenticated;

/**
 * set_my_birthday: the signed-in person saves or clears their own optional birthday.
 * Inputs: wanted_month (1 to 12, or null/left out to clear), wanted_day (null/left out for the
 *   month only).
 * Returns: {"month": n|null, "day": n|null}, what is saved now.
 * Errors: insufficient_privilege when signed out; check_violation (birthday_invalid).
 * Where it fits: Settings › Birthday (S1-E2-12). No account gate: it is a setting, not writing.
 */
create or replace function public.set_my_birthday(wanted_month integer default null, wanted_day integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Sign in to save a birthday.' using errcode = 'insufficient_privilege';
  end if;
  perform public.check_birthday(wanted_month, wanted_day);
  update public.profiles
    set birthday_month = wanted_month, birthday_day = case when wanted_month is null then null else wanted_day end
    where profiles.id = caller_id;
  return jsonb_build_object('month', wanted_month,
    'day', case when wanted_month is null then null else wanted_day end);
end;
$$;

comment on function public.set_my_birthday(integer, integer) is
  'Saves or clears the caller''s own optional birthday (day and month, never a year) (S1-E2-12).';
revoke execute on function public.set_my_birthday(integer, integer) from public, anon;
grant execute on function public.set_my_birthday(integer, integer) to authenticated;

/**
 * admin_set_birthday: staff correct a birthday the person says is wrong (S1-E2-12: "the user asks
 * staff to correct it").
 * Inputs: target_user_id; reason_given (required); wanted_month and wanted_day (null or left out
 *   to clear).
 * Returns: true.
 * Errors: as require_account_action_allowed() (owner, admin or moderator; not one's own account;
 *   a reason; a live account); check_violation (birthday_invalid).
 * Logging: account.birthday_corrected with the before and after values, same transaction.
 */
create or replace function public.admin_set_birthday(
  target_user_id uuid,
  reason_given text,
  wanted_month integer default null,
  wanted_day integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_month smallint;
  before_day smallint;
begin
  -- Step 1: the shared account-action checks, then the birthday itself.
  perform public.require_account_action_allowed(target_user_id, reason_given);
  perform public.check_birthday(wanted_month, wanted_day);
  -- Step 2: the change, keeping the old values for the log.
  select profiles.birthday_month, profiles.birthday_day into before_month, before_day
    from public.profiles where profiles.id = target_user_id for update;
  update public.profiles
    set birthday_month = wanted_month, birthday_day = case when wanted_month is null then null else wanted_day end
    where profiles.id = target_user_id;
  -- Step 3: the audit row, in the same transaction.
  perform public.log_staff_action(
    'account.birthday_corrected', 'profiles', target_user_id::text, target_user_id, btrim(reason_given),
    jsonb_build_object('birthday_month', before_month, 'birthday_day', before_day),
    jsonb_build_object('birthday_month', wanted_month,
      'birthday_day', case when wanted_month is null then null else wanted_day end)
  );
  return true;
end;
$$;

comment on function public.admin_set_birthday(uuid, text, integer, integer) is
  'Staff correct an account''s optional birthday on request, with a reason, logged (S1-E2-12).';
revoke execute on function public.admin_set_birthday(uuid, text, integer, integer) from public, anon;
grant execute on function public.admin_set_birthday(uuid, text, integer, integer) to authenticated;

/* ---------- The greeting ---------- */

/**
 * greeting_for: what the greeting line says for one account on one day (Romanian date).
 * Inputs: the birthday month and day, when the account joined, and the day to greet on.
 * Returns: 'birthday' on the day (a 29 February birthday counts on 28 February in other years),
 *   'birthday_month' during the month, 'anniversary' in the month they joined from the first
 *   anniversary on, or null. A birthday wins over the anniversary (S1-E2-13, proposal).
 * Pure, so tests can pass any day. Internal.
 */
create or replace function public.greeting_for(
  birthday_month integer,
  birthday_day integer,
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
  is_leap_year boolean := extract(day from (date_trunc('year', greeting_day) + interval '2 months' - interval '1 day')) = 29;
  greeted_day integer := birthday_day;
begin
  -- A 29 February birthday is greeted on 28 February when the year has no 29th.
  if birthday_month = 2 and birthday_day = 29 and not is_leap_year then
    greeted_day := 28;
  end if;
  if birthday_month = extract(month from greeting_day) then
    if greeted_day = extract(day from greeting_day) then
      return 'birthday';
    end if;
    return 'birthday_month';
  end if;
  if extract(month from joined_day) = extract(month from greeting_day)
     and extract(year from greeting_day) > extract(year from joined_day) then
    return 'anniversary';
  end if;
  return null;
end;
$$;

comment on function public.greeting_for(integer, integer, timestamptz, date) is
  'Internal: birthday, birthday_month, anniversary or null for one account on one day (S1-E2-12, S1-E2-13).';
revoke execute on function public.greeting_for(integer, integer, timestamptz, date) from public, anon, authenticated;

/**
 * my_greeting: what the signed-in greeting line says today, Romanian time.
 * Returns: {"kind": "birthday" | "birthday_month" | "anniversary" | null, "years": n} where years
 *   is how many years since joining (for the anniversary line). {"kind": null} when signed out.
 * Where it fits: the greeting line at the top of Discover (S1-E2-13).
 */
create or replace function public.my_greeting()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object(
       'kind', public.greeting_for(profiles.birthday_month, profiles.birthday_day, profiles.created_at,
         (now() at time zone 'Europe/Bucharest')::date),
       'years', extract(year from (now() at time zone 'Europe/Bucharest'))::integer
         - extract(year from (profiles.created_at at time zone 'Europe/Bucharest'))::integer)
     from public.profiles
     where profiles.id = (select auth.uid()) and profiles.deleted_at is null),
    jsonb_build_object('kind', null, 'years', 0));
$$;

comment on function public.my_greeting() is
  'What the signed-in greeting line says today: birthday, birthday_month, anniversary or null (S1-E2-12, S1-E2-13).';
revoke execute on function public.my_greeting() from public, anon;
grant execute on function public.my_greeting() to authenticated;
