-- Migration: user management in the admin site (story S1-E11-02; architecture 1.8.2 to 1.8.4,
-- screen 8.5).
-- What it adds (no new tables, so no new policies; every function checks the caller itself):
--   admin_user_lookup()           find accounts by username, pen name, whole email or user ID
--   admin_user_account()          one account's status, age group and check, roles, masked email
--   admin_account_open_cases()    the open cases about an account, for staff who may see them
--   admin_reveal_email()          now for every role with the reveal_email area (moderator and
--                                 support too, architecture 1.8.3), still logged
--   admin_reset_pen_name()        clears an account's pen name, the old one kept in the audit log
--   admin_sign_out_everywhere()   ends every session of an account
-- Suspend, ban and warn use admin_apply_sanction() and lifting uses admin_lift_sanction() (both
-- S1-E10-06); approving a username uses admin_approve_username() (S1-E2-04).
-- Who may do what (architecture 1.8.3): look up and status: owner, admin, moderator act, support
-- view (staff_may('users')); sanctions, pen name and sign-out: owner, admin, moderator
-- (staff_may('user_sanctions')); open cases: moderation staff, safeguarding cases only with the
-- permission (may_see_case()). The content editor has none of these.
-- Least privilege: staff see the age group and the age check result and date, never the year of
-- birth (architecture 1.8.3); the email is masked until "Show", which is logged; private messages
-- are never read here (there are none before S1-E9, and then only those attached to a report).
-- Called by: src/features/staff/api/userManagement.ts.

/* ---------- Finding accounts ---------- */

/**
 * admin_user_lookup: the Users search (screen 8.5's results table).
 * Input: search_text: a username (with or without "@", look-alikes folded, the start is enough),
 *   a pen name (any part), a whole email address (case ignored), a full user ID or the 8-character
 *   short ID staff screens show. At least two characters.
 * Returns: up to 20 accounts with username, pen name, account status, the age check result and its
 *   date, staff roles, what matched, and two columns that stay null for a role that may not see
 *   them: the kinds of sanction the account has had (user_sanctions view) and how many open cases
 *   are about it that the caller may see (moderation view).
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Users in a staff
 *   session.
 * Logging: an account found by its email is a sensitive read naming the account, never the
 *   address (as admin_find_accounts(), S1-E11-01b).
 * Where it fits: /staff/users → useUserLookup → api/userManagement.ts → here.
 */
create or replace function public.admin_user_lookup(search_text text)
returns table (
  user_id uuid,
  handle text,
  pen_name text,
  account_status public.account_status,
  age_check_result public.age_check_result,
  age_checked_at timestamptz,
  staff_roles public.staff_role[],
  matched_by text,
  sanction_kinds public.sanction_kind[],
  open_case_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(btrim(coalesce(search_text, '')));
  is_email boolean := wanted ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  -- A full user ID, or the first 8 characters the staff screens show.
  is_user_id boolean := wanted ~ '^[0-9a-f]{8}(-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$';
  may_see_sanctions boolean := public.staff_may('user_sanctions', 'view');
  may_see_cases boolean := public.staff_may('moderation', 'view');
  found record;
begin
  -- Step 1: owner, admin, moderator and support, in a staff session.
  if not public.staff_may('users', 'view') then
    raise exception 'Only staff with the Users area can look up accounts.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: too short to search finds nothing (no listing every account by typing one letter).
  if char_length(btrim(wanted, ' @')) < 2 then
    return;
  end if;

  -- Step 3: the matches: an email or a user ID first, then usernames, then pen names.
  for found in
    select profiles.id, profiles.handle, profiles.pen_name, profiles.age_check_result,
           profiles.age_checked_at,
           case
             when is_email and lower(users.email) = wanted then 'email'
             when is_user_id and starts_with(profiles.id::text, wanted) then 'user_id'
             when starts_with(profiles.handle_skeleton, public.username_skeleton(btrim(wanted, ' @'))) then 'username'
             else 'pen_name'
           end as matched
    from public.profiles
    left join auth.users on users.id = profiles.id
    where (is_email and lower(users.email) = wanted)
       or (is_user_id and starts_with(profiles.id::text, wanted))
       or (not is_email
           and starts_with(profiles.handle_skeleton, public.username_skeleton(btrim(wanted, ' @'))))
       or (not is_email and strpos(lower(profiles.pen_name), wanted) > 0)
    order by (is_email and lower(users.email) = wanted) desc,
             (is_user_id and starts_with(profiles.id::text, wanted)) desc,
             profiles.handle nulls last
    limit 20
  loop
    -- Step 4: finding an account by its email is logged, naming the account, never the address.
    if found.matched = 'email' then
      perform public.log_staff_action('sensitive_read.account_found_by_email', 'profiles',
        found.id::text, found.id);
    end if;
    user_id := found.id;
    handle := found.handle;
    pen_name := found.pen_name;
    account_status := public.account_state(found.id);
    age_check_result := found.age_check_result;
    age_checked_at := found.age_checked_at;
    staff_roles := coalesce(
      (select array_agg(roles.role order by roles.role) from public.staff_roles as roles
       where roles.user_id = found.id), '{}');
    matched_by := found.matched;
    -- Step 5: the two columns only some roles may see (architecture 1.8.3).
    sanction_kinds := case when may_see_sanctions then coalesce(
      (select array_agg(distinct sanctions.kind) from public.sanctions
       where sanctions.user_id = found.id), '{}') end;
    open_case_count := case when may_see_cases then
      (select count(*)::integer from public.cases
       where cases.user_id = found.id and cases.status = 'open'
         and public.may_see_case(cases.is_safeguarding)) end;
    return next;
  end loop;
end;
$$;

comment on function public.admin_user_lookup(text) is
  'Users search for owner, admin, moderator and support: username, pen name, whole email (logged) or user ID (S1-E11-02).';
revoke execute on function public.admin_user_lookup(text) from public, anon;
grant execute on function public.admin_user_lookup(text) to authenticated;

/* ---------- One account ---------- */

/**
 * admin_user_account: the account page's summary (screen 8.5's account panel).
 * Input: target_user_id (staff may use IDs, architecture 1.6).
 * Returns: one row: username, pen name, when it joined, account status, the age group (from the
 *   year of birth; never the year itself, architecture 1.8.3), the age check result, date and
 *   method, the email masked, staff roles, and what the caller may do here: see sanctions, act on
 *   the account (sanctions, pen name, sign-out), show the email, read the account's audit rows.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Users in a staff
 *   session; check_violation (hint no_such_account) when there is no such account.
 * Logging: none. Opening an account isn't on the sensitive-read list (architecture 1.8.3); the
 *   email stays masked until "Show", which admin_reveal_email() logs.
 */
create or replace function public.admin_user_account(target_user_id uuid)
returns table (
  user_id uuid,
  handle text,
  pen_name text,
  joined_at timestamptz,
  account_status public.account_status,
  age_band public.age_band,
  age_check_result public.age_check_result,
  age_checked_at timestamptz,
  age_check_method text,
  email_masked text,
  staff_roles public.staff_role[],
  may_view_sanctions boolean,
  may_act boolean,
  may_reveal_email boolean,
  may_read_audit_log boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found record;
begin
  -- Step 1: owner, admin, moderator and support, in a staff session.
  if not public.staff_may('users', 'view') then
    raise exception 'Only staff with the Users area can open an account.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the account, deleted ones included (staff may still need their history).
  select profiles.*, users.email into found
  from public.profiles
  left join auth.users on users.id = profiles.id
  where profiles.id = target_user_id;
  if found.id is null then
    raise exception 'There is no such account.' using errcode = 'check_violation', hint = 'no_such_account';
  end if;
  -- Step 3: the row. The age group uses the younger possible age, as age_band() does.
  user_id := found.id;
  handle := found.handle;
  pen_name := found.pen_name;
  joined_at := found.created_at;
  account_status := public.account_state(found.id);
  age_band := coalesce(public.age_band_from_birth(found.birth_year, found.birth_month,
    found.age_check_result, (now() at time zone 'Europe/Bucharest')::date), 'unknown');
  age_check_result := found.age_check_result;
  age_checked_at := found.age_checked_at;
  age_check_method := found.age_check_method::text;
  email_masked := public.mask_email(found.email);
  staff_roles := coalesce(
    (select array_agg(roles.role order by roles.role) from public.staff_roles as roles
     where roles.user_id = found.id), '{}');
  may_view_sanctions := public.staff_may('user_sanctions', 'view');
  may_act := public.staff_may('user_sanctions', 'act');
  may_reveal_email := public.staff_may('reveal_email', 'act');
  may_read_audit_log := public.staff_may('audit_log', 'view');
  return next;
end;
$$;

comment on function public.admin_user_account(uuid) is
  'One account''s summary for staff: status, age group and check, masked email, roles and what the caller may do (S1-E11-02).';
revoke execute on function public.admin_user_account(uuid) from public, anon;
grant execute on function public.admin_user_account(uuid) to authenticated;

/**
 * admin_account_open_cases: the open cases about an account (screen 8.5's "Open cases").
 * Input: target_user_id. Returns: each open case the caller may see (a safeguarding case only
 *   with the safeguarding permission), most urgent first: its ID, reference, item type, top reason,
 *   tier and deadline.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is moderation staff.
 */
create or replace function public.admin_account_open_cases(target_user_id uuid)
returns table (
  case_id uuid,
  reference text,
  item_type public.reportable_type,
  top_reason public.report_reason,
  tier public.case_tier,
  deadline_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff can see cases.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  return query
    select cases.id, cases.reference, cases.item_type, cases.top_reason, cases.tier, cases.deadline_at
    from public.cases
    where cases.user_id = target_user_id and cases.status = 'open'
      and public.may_see_case(cases.is_safeguarding)
    order by cases.deadline_at;
end;
$$;

comment on function public.admin_account_open_cases(uuid) is
  'The open cases about an account that the caller may see, most urgent first (S1-E11-02).';
revoke execute on function public.admin_account_open_cases(uuid) from public, anon;
grant execute on function public.admin_account_open_cases(uuid) to authenticated;

/* ---------- Showing the email ---------- */

/**
 * admin_reveal_email: "Show (logged)" on an account. Unchanged except who may: every role with the
 * reveal_email area (owner, admin, moderator, support; architecture 1.8.3), not only owner and
 * admin as in S1-E11-01b.
 * Input: target_user_id. Returns: the account's email address.
 * Errors: insufficient_privilege (hint not_allowed); check_violation (hint no_such_account).
 * Logging: sensitive_read.email_revealed, in the same transaction, before the address is returned.
 */
create or replace function public.admin_reveal_email(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  address text;
begin
  if not public.staff_may('reveal_email', 'act') then
    raise exception 'Your role can''t see email addresses.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  select users.email into address
  from auth.users
  join public.profiles on profiles.id = users.id and profiles.deleted_at is null
  where users.id = target_user_id;
  if address is null then
    raise exception 'There is no such account.' using errcode = 'check_violation', hint = 'no_such_account';
  end if;
  perform public.log_sensitive_read('email_revealed', 'profiles', target_user_id::text, target_user_id);
  return address;
end;
$$;

comment on function public.admin_reveal_email(uuid) is
  'Shows one account''s email to staff with the reveal_email area and logs it as a sensitive read (S1-E11-01b, S1-E11-02).';

/* ---------- Acting on an account ---------- */

/**
 * require_account_action_allowed: the checks the account actions below share.
 * Inputs: target_user_id; reason_given. Returns: nothing.
 * Errors (hint): insufficient_privilege (not_allowed) unless the caller may act on user sanctions
 *   (owner, admin, moderator) in a staff session; insufficient_privilege (own_account) on the
 *   caller's own account (Settings is the place for that); check_violation (reason_missing) for a
 *   blank reason; check_violation (no_such_account) for an account that doesn't exist.
 */
create or replace function public.require_account_action_allowed(target_user_id uuid, reason_given text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only an owner, admin or moderator can act on an account.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Use Settings for your own account.'
      using errcode = 'insufficient_privilege', hint = 'own_account';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write a reason. It goes to the audit log.'
      using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  if not exists (select 1 from public.profiles where profiles.id = target_user_id and profiles.deleted_at is null) then
    raise exception 'There is no such account.' using errcode = 'check_violation', hint = 'no_such_account';
  end if;
end;
$$;

comment on function public.require_account_action_allowed(uuid, text) is
  'Internal: role, own account, reason and account checks shared by the account actions (S1-E11-02).';
revoke execute on function public.require_account_action_allowed(uuid, text) from public, anon, authenticated;

/**
 * admin_reset_pen_name: "Reset pen name", for a pen name that breaks the rules.
 * Inputs: target_user_id; reason_given (required, goes to the audit log).
 * Returns: true. The account then shows its username until the person chooses a new pen name,
 *   which they may do at once (the 30-day limit is cleared, so the reset doesn't lock them out);
 *   a new name meets the usual word checks (S1-E2-04).
 * Errors: as require_account_action_allowed(); check_violation (hint no_pen_name) when the account
 *   has no pen name.
 * Logging: account.pen_name_reset with the old pen name as the before value, so staff can still
 *   find old work by it (architecture 1.6), in the same transaction.
 */
create or replace function public.admin_reset_pen_name(target_user_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_pen_name text;
begin
  -- Step 1: the shared checks.
  perform public.require_account_action_allowed(target_user_id, reason_given);
  -- Step 2: there must be a pen name to reset.
  select profiles.pen_name into old_pen_name from public.profiles
    where profiles.id = target_user_id for update;
  if old_pen_name is null then
    raise exception 'This account has no pen name.' using errcode = 'check_violation', hint = 'no_pen_name';
  end if;
  -- Step 3: clear it, and let the person choose a new one straight away.
  update public.profiles set pen_name = null, pen_name_changed_at = null
    where profiles.id = target_user_id;
  -- Step 4: the audit row, in the same transaction.
  perform public.log_staff_action(
    'account.pen_name_reset', 'profiles', target_user_id::text, target_user_id, btrim(reason_given),
    jsonb_build_object('pen_name', old_pen_name), jsonb_build_object('pen_name', null)
  );
  return true;
end;
$$;

comment on function public.admin_reset_pen_name(uuid, text) is
  'Clears an account''s pen name with a reason; the old one stays in the audit log (S1-E11-02).';
revoke execute on function public.admin_reset_pen_name(uuid, text) from public, anon;
grant execute on function public.admin_reset_pen_name(uuid, text) to authenticated;

/**
 * admin_sign_out_everywhere: "Sign out everywhere", for example after the person says someone else
 * used their account.
 * Inputs: target_user_id; reason_given (required). Returns: how many sessions ended.
 *   A token already issued lasts until it expires, at most an hour (as sign_out_everywhere(),
 *   S1-E10-06).
 * Errors: as require_account_action_allowed().
 * Logging: account.signed_out_everywhere with the number of sessions, in the same transaction.
 */
create or replace function public.admin_sign_out_everywhere(target_user_id uuid, reason_given text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ended integer;
begin
  perform public.require_account_action_allowed(target_user_id, reason_given);
  select count(*)::integer into ended from auth.sessions where sessions.user_id = target_user_id;
  perform public.sign_out_everywhere(target_user_id);
  perform public.log_staff_action(
    'account.signed_out_everywhere', 'profiles', target_user_id::text, target_user_id,
    btrim(reason_given), null, jsonb_build_object('sessions_ended', ended)
  );
  return ended;
end;
$$;

comment on function public.admin_sign_out_everywhere(uuid, text) is
  'Ends every session of an account with a reason, logged (S1-E11-02).';
revoke execute on function public.admin_sign_out_everywhere(uuid, text) from public, anon;
grant execute on function public.admin_sign_out_everywhere(uuid, text) to authenticated;
