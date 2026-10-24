-- Pick the account when granting a role (story S1-E11-01b; Robert's request of 24 Oct 2026,
-- passed on by the CTO: "grant a role by picking an account that already exists, not by typing
-- an identifier").
--
-- What it adds or changes:
--   mask_email()                 "r***@gmail.com": the first letter, then the domain (internal)
--   admin_find_accounts()        owner and admin search existing accounts by username, pen name
--                                or a whole email address, for /staff/roles; an email is shown
--                                masked, and finding an account by its email is a logged
--                                sensitive read (architecture 1.8.3)
--   admin_reveal_email()         "Show email" on a result: returns the address and logs
--                                sensitive_read.email_revealed in the same transaction
--   require_not_last_owner()     the last-owner guard of admin_remove_role(), on its own so a
--                                database test can call it with the last owner as target (no
--                                screen can reach it: nobody changes their own role, and only an
--                                owner reaches another owner, CTO 24 Oct 2026)
--   require_role_change_allowed(), require_role_in_reach(), admin_remove_role(),
--   admin_set_permission()       the same rules as before (S1-E2-07a, S1-E11-01), now each refusal
--                                carries a HINT naming the problem (no_such_account,
--                                reason_missing, last_owner, not_staff, own_role,
--                                owner_only_role, not_allowed, sign_in_again), so the screen says
--                                which one instead of one combined sentence
-- Owner-only and audit-log rules are unchanged: only the hints are new.
-- Privacy: an email is matched only whole (no partial match, so the search can't be used to
-- fish for addresses), never shown in full on the list, and never written to the audit log.

/* ---------- Finding an account ---------- */

/**
 * mask_email: hides an email address on a list.
 * Input: address. Returns: the first character, "***", then "@" and the domain
 *   ("r***@gmail.com"); null for null.
 * Internal: admin_find_accounts() uses it.
 */
create or replace function public.mask_email(address text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when address is null then null
    else left(address, 1) || '***@' || split_part(address, '@', 2)
  end;
$$;

comment on function public.mask_email(text) is
  'Internal: "r***@gmail.com", an email address hidden for lists (S1-E11-01b).';
revoke execute on function public.mask_email(text) from public, anon, authenticated;

/**
 * admin_find_accounts: finds existing accounts to give a role to.
 * Input: search_text: a username (with or without "@", look-alikes folded, the start is enough),
 *   a pen name (any part, case ignored) or a whole email address (case ignored). At least two
 *   characters.
 * Returns: up to 10 accounts: user ID (staff may see it, architecture 1.6), username, pen name,
 *   the email masked, what matched ('username', 'pen_name' or 'email') and the staff roles the
 *   account already holds.
 * Errors: insufficient_privilege unless the caller may manage roles in a staff session.
 * Logging: an account found by its email is a sensitive read (sensitive_read.account_found_by_email,
 *   with the account as target and never the address), because it ties an address to an account.
 * Where it fits: the account picker on /staff/roles (S1-E11-01b). S1-E11-02 (Users) may widen it.
 */
create or replace function public.admin_find_accounts(search_text text)
returns table (
  user_id uuid,
  handle text,
  pen_name text,
  email_masked text,
  matched_by text,
  staff_roles public.staff_role[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := btrim(coalesce(search_text, ''));
  is_email boolean := wanted ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  found record;
begin
  -- Step 1: owner and admin only, in a staff session.
  if not public.staff_may('roles', 'act') then
    raise exception 'Only an owner or admin can look up accounts here.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: too short to search finds nothing (no listing every account by typing one letter).
  if char_length(btrim(wanted, ' @')) < 2 then
    return;
  end if;

  -- Step 3: the matches, an email match first, then usernames, then pen names.
  for found in
    select
      profiles.id,
      profiles.handle,
      profiles.pen_name,
      public.mask_email(users.email) as masked,
      case
        when is_email and lower(users.email) = lower(wanted) then 'email'
        when starts_with(profiles.handle_skeleton, public.username_skeleton(btrim(wanted, ' @'))) then 'username'
        else 'pen_name'
      end as matched,
      coalesce(
        (select array_agg(roles.role order by roles.role) from public.staff_roles as roles
         where roles.user_id = profiles.id),
        '{}'
      ) as roles
    from public.profiles
    join auth.users on users.id = profiles.id
    where profiles.deleted_at is null
      and (
        (is_email and lower(users.email) = lower(wanted))
        or (not is_email
            and starts_with(profiles.handle_skeleton, public.username_skeleton(btrim(wanted, ' @'))))
        or (not is_email and strpos(lower(profiles.pen_name), lower(wanted)) > 0)
      )
    order by (is_email and lower(users.email) = lower(wanted)) desc, profiles.handle nulls last
    limit 10
  loop
    -- Step 4: finding an account by its email is logged, naming the account, never the address.
    if found.matched = 'email' then
      perform public.log_staff_action('sensitive_read.account_found_by_email', 'profiles',
        found.id::text, found.id);
    end if;
    user_id := found.id;
    handle := found.handle;
    pen_name := found.pen_name;
    email_masked := found.masked;
    matched_by := found.matched;
    staff_roles := found.roles;
    return next;
  end loop;
end;
$$;

comment on function public.admin_find_accounts(text) is
  'Owner and admin find accounts by username, pen name or whole email, email masked; an email match is logged (S1-E11-01b).';
revoke execute on function public.admin_find_accounts(text) from public, anon;
grant execute on function public.admin_find_accounts(text) to authenticated;

/**
 * admin_reveal_email: "Show email" on an account in the picker.
 * Input: target_user_id. Returns: the account's email address.
 * Errors: insufficient_privilege unless the caller may manage roles in a staff session (hint
 *   not_allowed); check_violation when there is no such account (hint no_such_account).
 * Logging: sensitive_read.email_revealed through log_sensitive_read(), in the same transaction,
 *   before the address is returned (architecture 1.8.3: revealing an email is logged).
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
  if not public.staff_may('roles', 'act') then
    raise exception 'Only an owner or admin can see an email here.'
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
  'Shows one account''s email to owner and admin and logs it as a sensitive read (S1-E11-01b).';
revoke execute on function public.admin_reveal_email(uuid) from public, anon;
grant execute on function public.admin_reveal_email(uuid) to authenticated;

/* ---------- The same checks, each naming its problem ---------- */

/**
 * require_role_change_allowed: the checks every role or permission change shares (S1-E2-07a), with
 *   the fresh sign-in (S1-E11-01). Unchanged rules; each refusal now has a HINT the screen reads.
 * Inputs: target_user_id; reason_given. Returns: nothing.
 * Errors (hint): insufficient_privilege (not_allowed) unless the caller may manage roles in a staff
 *   session; invalid_authorization_specification (sign_in_again) for a sign-in older than
 *   staff_fresh_sign_in_minutes; insufficient_privilege (own_role) when the caller targets
 *   themselves; check_violation (reason_missing) for a blank reason; check_violation
 *   (no_such_account) for an account that doesn't exist.
 */
create or replace function public.require_role_change_allowed(target_user_id uuid, reason_given text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('roles', 'act') then
    raise exception 'Only an owner or admin can change staff roles.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  if not public.staff_signed_in_recently() then
    raise exception 'Sign in again to change a staff role.'
      using errcode = 'invalid_authorization_specification', hint = 'sign_in_again';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Nobody can change their own role.'
      using errcode = 'insufficient_privilege', hint = 'own_role';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Give a reason.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  if not exists (select 1 from public.profiles where profiles.id = target_user_id and profiles.deleted_at is null) then
    raise exception 'There is no such account.' using errcode = 'check_violation', hint = 'no_such_account';
  end if;
end;
$$;

comment on function public.require_role_change_allowed(uuid, text) is
  'Internal: the shared checks before a staff role or permission changes, each refusal with a hint (S1-E2-07a, S1-E11-01, S1-E11-01b).';

/**
 * require_role_in_reach: may the caller grant or remove this role? (S1-E2-07a)
 * Input: changed_role. Errors: insufficient_privilege (hint owner_only_role) when an admin tries
 *   owner or admin. Rule: an owner grants any role; an admin grants moderator, support and
 *   content editor only (architecture 1.8.3, Roles row).
 */
create or replace function public.require_role_in_reach(changed_role public.staff_role)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if changed_role in ('owner', 'admin') and not public.is_staff('owner') then
    raise exception 'Only an owner can grant or remove the owner and admin roles.'
      using errcode = 'insufficient_privilege', hint = 'owner_only_role';
  end if;
end;
$$;

/**
 * require_not_last_owner: the platform always keeps an owner (S1-E2-07a's safety net).
 * Inputs: target_user_id; removed_role. Returns: nothing.
 * Errors: check_violation (hint last_owner) when removing that role would leave no owner.
 * Internal: admin_remove_role() calls it. No screen can reach the refusal today (the self-change
 *   rule stops the last owner removing themselves, and only an owner can reach another owner),
 *   so database test 046 calls it directly with the last owner as target (CTO, 24 Oct 2026).
 */
create or replace function public.require_not_last_owner(target_user_id uuid, removed_role public.staff_role)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if removed_role = 'owner'
    and exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id and role = 'owner')
    and (select count(*) from public.staff_roles where role = 'owner') <= 1 then
    raise exception 'The last owner can''t be removed.' using errcode = 'check_violation', hint = 'last_owner';
  end if;
end;
$$;

comment on function public.require_not_last_owner(uuid, public.staff_role) is
  'Internal: refuses removing the last owner, with the hint last_owner (S1-E2-07a, S1-E11-01b).';
revoke execute on function public.require_not_last_owner(uuid, public.staff_role) from public, anon, authenticated;

/**
 * admin_remove_role: takes a staff role away (S1-E2-07a); the last-owner guard is now
 *   require_not_last_owner(), whose refusal carries the hint last_owner.
 * Inputs: target_user_id; removed_role; reason_given. Returns: true when removed, false when they
 *   didn't hold it.
 * Errors: as require_role_change_allowed() and require_role_in_reach(); check_violation (hint
 *   last_owner, from require_not_last_owner()) when it would remove the last owner.
 */
create or replace function public.admin_remove_role(
  target_user_id uuid,
  removed_role public.staff_role,
  reason_given text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_row_id uuid;
begin
  perform public.require_role_change_allowed(target_user_id, reason_given);
  perform public.require_role_in_reach(removed_role);
  -- The platform always keeps an owner (a safety net: the self-change rule already stops the
  -- last owner removing themselves, and only an owner can reach another owner).
  perform public.require_not_last_owner(target_user_id, removed_role);
  delete from public.staff_roles
  where staff_roles.user_id = target_user_id and staff_roles.role = removed_role
  returning id into removed_row_id;
  if removed_row_id is null then
    return false;
  end if;
  perform public.log_staff_action('staff.role_removed', 'staff_roles', removed_row_id::text, target_user_id,
    reason_given, jsonb_build_object('role', removed_role), null);
  return true;
end;
$$;

/**
 * admin_set_permission: ticks or unticks one permission for a staff member (S1-E2-07a); the
 *   non-staff refusal now carries the hint not_staff.
 * Inputs: target_user_id; changed_permission; should_hold (true to give, false to take away);
 *   reason_given. Returns: true when something changed.
 * Errors: as require_role_change_allowed(); check_violation (hint not_staff) when the person holds
 *   no staff role.
 */
create or replace function public.admin_set_permission(
  target_user_id uuid,
  changed_permission public.staff_permission,
  should_hold boolean,
  reason_given text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_row_id uuid;
begin
  perform public.require_role_change_allowed(target_user_id, reason_given);
  if not exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    raise exception 'Permissions are only for staff.' using errcode = 'check_violation', hint = 'not_staff';
  end if;
  if should_hold then
    insert into public.staff_permissions (user_id, permission, granted_by_user_id)
    values (target_user_id, changed_permission, (select auth.uid()))
    on conflict (user_id, permission) do nothing
    returning id into changed_row_id;
  else
    delete from public.staff_permissions
    where staff_permissions.user_id = target_user_id and staff_permissions.permission = changed_permission
    returning id into changed_row_id;
  end if;
  if changed_row_id is null then
    return false;
  end if;
  perform public.log_staff_action(
    case when should_hold then 'staff.permission_granted' else 'staff.permission_removed' end,
    'staff_permissions', changed_row_id::text, target_user_id, reason_given,
    jsonb_build_object('permission', changed_permission, 'held', not should_hold),
    jsonb_build_object('permission', changed_permission, 'held', should_hold)
  );
  return true;
end;
$$;
