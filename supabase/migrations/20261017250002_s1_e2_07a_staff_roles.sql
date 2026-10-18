-- Staff roles and permissions on the normal email login (story S1-E2-07a; architecture 1.8.3).
--
-- What it adds:
--   staff_permissions          who holds safeguarding, teacher_checks or on_call
--   staff_role_areas           the roles table of architecture 1.8.3, one row per role and area
--   staff_may(area, access)    the one check every staff rule uses: the caller's role (or
--                              permission) allows it AND the session is a staff session
--   admin_grant_role(), admin_remove_role(), admin_grant_permission(), admin_remove_permission()
--                              audited changes, with the rules below
--   admin_list_staff(), admin_user_id_for_handle()   for the /staff/roles page
--   bootstrap_first_owner()    makes the very first owner, once, from the SQL editor
--   account_state()            answers staff_account for an account with a staff role
-- Rules (story S1-E2-07a; architecture 1.8.3; decided 17 Oct 2026, 12:44 and 19:43, Q14):
--   - an owner grants any role; an admin grants moderator, support and content editor only;
--   - nobody changes their own role or permissions; a reason is always required;
--   - the last owner can't be removed;
--   - every change goes to the audit log with the before and after values, in the same step;
--   - signing up never gives a staff role (only these functions and the seed write staff_roles).
-- Why one helper: in March is_staff_session() is true for any staff-role session; S1-E2-07b makes
-- it the Google Workspace check, and because every rule goes through staff_may(), that one
-- function is all 07b has to change.

/* ---------- Tables ---------- */

create table public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  permission public.staff_permission not null,
  granted_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_permissions_one_row_per_permission unique (user_id, permission)
);

comment on table public.staff_permissions is
  'kind: staff
Per-person staff permissions (safeguarding, teacher checks, on call), ticked by an owner or admin (architecture 1.8.3).';

create table public.staff_role_areas (
  id uuid primary key default gen_random_uuid(),
  role public.staff_role not null,
  area text not null,
  -- view: may look; act: may look and change.
  access text not null,
  -- When set, the role needs this permission too ("with the permission" in architecture 1.8.3).
  required_permission public.staff_permission,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_role_areas_access_is_known check (access in ('view', 'act')),
  constraint staff_role_areas_one_row_per_role_and_area unique (role, area)
);

comment on table public.staff_role_areas is
  'kind: platform
What each staff role may do in each admin area: architecture 1.8.3, one row per role and area (S1-E2-07a).';

create trigger staff_permissions_set_updated_at
  before update on public.staff_permissions
  for each row execute function public.set_updated_at();
create trigger staff_permissions_refuse_user_id_change
  before update on public.staff_permissions
  for each row execute function public.refuse_user_id_change('user_id');
create trigger staff_role_areas_set_updated_at
  before update on public.staff_role_areas
  for each row execute function public.set_updated_at();

alter table public.staff_permissions enable row level security;
alter table public.staff_role_areas enable row level security;

-- Table privileges, exactly what the policies below need (CLAUDE.md, Conventions): authenticated
-- may read, and the policies decide which rows. Changes go only through the audited functions
-- below (and migrations for the areas), so nobody gets a write privilege.
revoke all on public.staff_permissions, public.staff_role_areas from anon, authenticated;
-- staff_permissions_select_own, staff_permissions_select_roles
grant select on public.staff_permissions to authenticated;
-- staff_role_areas_select_staff
grant select on public.staff_role_areas to authenticated;

-- Architecture 1.8.3, row by row. Areas are named after the admin site's menu (1.8.2).
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('moderation', 'owner', 'act', null), ('moderation', 'admin', 'act', null), ('moderation', 'moderator', 'act', null),
  ('safeguarding', 'owner', 'act', 'safeguarding'), ('safeguarding', 'admin', 'act', 'safeguarding'),
  ('safeguarding', 'moderator', 'act', 'safeguarding'),
  ('appeals', 'owner', 'act', null), ('appeals', 'admin', 'act', null), ('appeals', 'moderator', 'act', null),
  ('removal_orders', 'owner', 'act', 'on_call'), ('removal_orders', 'admin', 'act', 'on_call'),
  ('removal_orders', 'moderator', 'act', 'on_call'),
  ('users', 'owner', 'act', null), ('users', 'admin', 'act', null), ('users', 'moderator', 'act', null),
  ('users', 'support', 'view', null),
  ('user_sanctions', 'owner', 'act', null), ('user_sanctions', 'admin', 'act', null),
  ('user_sanctions', 'moderator', 'act', null),
  ('reveal_email', 'owner', 'act', null), ('reveal_email', 'admin', 'act', null),
  ('reveal_email', 'moderator', 'act', null), ('reveal_email', 'support', 'act', null),
  ('roles', 'owner', 'act', null), ('roles', 'admin', 'act', null),
  ('stories', 'owner', 'act', null), ('stories', 'admin', 'act', null), ('stories', 'moderator', 'act', null),
  ('stories', 'support', 'view', null),
  ('story_changes', 'owner', 'act', null), ('story_changes', 'admin', 'act', null),
  ('story_changes', 'moderator', 'act', null),
  ('classics', 'owner', 'act', null), ('classics', 'admin', 'act', null),
  ('data_requests', 'owner', 'act', null), ('data_requests', 'admin', 'act', null),
  ('data_requests', 'support', 'act', null),
  ('schools', 'owner', 'act', null), ('schools', 'admin', 'act', null),
  ('schools', 'moderator', 'act', 'teacher_checks'),
  -- Website CMS and interface text: owner and admin only, so the content editor role has no area
  -- for now; whether to keep that role is OPEN (decided 17 Oct 2026, 19:19; architecture 1.8.3).
  ('website_cms', 'owner', 'act', null), ('website_cms', 'admin', 'act', null),
  ('interface_text', 'owner', 'act', null), ('interface_text', 'admin', 'act', null),
  ('sponsors', 'owner', 'act', null), ('sponsors', 'admin', 'act', null),
  ('settings', 'owner', 'act', null), ('settings', 'admin', 'act', null),
  ('open_market', 'owner', 'act', null),
  ('metrics', 'owner', 'view', null), ('metrics', 'admin', 'view', null), ('metrics', 'moderator', 'view', null),
  ('audit_log', 'owner', 'act', null), ('audit_log', 'admin', 'act', null);

/* ---------- The one check ---------- */

/**
 * staff_may: may the signed-in person do this in this admin area?
 * Inputs: target_area (for example 'settings'); wanted_access, 'view' or 'act' (act includes view).
 * Returns: true only when one of the caller's roles allows it (with the permission the row needs,
 *   if any) AND is_staff_session() is true. False when signed out.
 * Where it fits: every staff policy and every admin_* function (architecture 1.8.1: the server
 *   decides, not the menu).
 */
create or replace function public.staff_may(target_area text, wanted_access text default 'act')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff_session() and exists (
    select 1
    from public.staff_roles as roles
    join public.profiles on profiles.id = roles.user_id and profiles.deleted_at is null
    join public.staff_role_areas as areas on areas.role = roles.role
    where roles.user_id = (select auth.uid())
      and areas.area = target_area
      and (wanted_access = 'view' or areas.access = 'act')
      and (
        areas.required_permission is null
        or exists (
          select 1 from public.staff_permissions as permissions
          where permissions.user_id = roles.user_id
            and permissions.permission = areas.required_permission
        )
      )
  );
$$;

comment on function public.staff_may(text, text) is
  'True when the caller''s staff role (and permission) allows the area and the session is a staff session (architecture 1.8.3, S1-E2-07a).';

revoke execute on function public.staff_may(text, text) from public, anon;
grant execute on function public.staff_may(text, text) to authenticated;

comment on function public.is_staff_session() is
  'True when the session may use staff powers. March: any staff-role session (S1-E2-07a). S1-E2-07b makes it the Google Workspace sign-in check on STAFF_EMAIL_DOMAIN; every staff rule reaches it through staff_may().';

/* ---------- Policies ---------- */

/**
 * Policy staff_permissions_select_own: a staff member reads their own permissions.
 * Why: the admin menu shows the areas they can use (architecture 1.8.2).
 */
create policy staff_permissions_select_own
  on public.staff_permissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy staff_permissions_select_own on public.staff_permissions is
  'Allows a staff member to read their own permissions, for the admin menu (S1-E2-07a).';

/**
 * Policy staff_permissions_select_roles: people who manage roles read everyone's permissions.
 * Why: owner and admin tick permissions per person (architecture 1.8.3).
 */
create policy staff_permissions_select_roles
  on public.staff_permissions
  for select
  to authenticated
  using ((select public.staff_may('roles', 'view')));

comment on policy staff_permissions_select_roles on public.staff_permissions is
  'Allows owner and admin, in a staff session, to read every staff permission (architecture 1.8.3).';

/**
 * Policy staff_role_areas_select_staff: any staff member reads the role and area map.
 * Why: the admin site shows only the areas a person's role can use (architecture 1.8.2); the map
 * holds no personal data. Members and visitors don't need it.
 */
create policy staff_role_areas_select_staff
  on public.staff_role_areas
  for select
  to authenticated
  using ((select public.is_staff_session()));

comment on policy staff_role_areas_select_staff on public.staff_role_areas is
  'Allows staff sessions to read which role may use which admin area (architecture 1.8.2).';

-- Every earlier staff rule moves onto staff_may(), so each now also needs a staff session.
-- The names stay the same; what each allows is unchanged in March.
alter policy staff_roles_select_admin on public.staff_roles
  using ((select public.staff_may('roles', 'view')));
comment on policy staff_roles_select_admin on public.staff_roles is
  'Allows owner and admin, in a staff session, to read every staff role; they manage roles (architecture 1.8.3).';

alter policy feature_flags_select_admin on public.feature_flags
  using ((select public.staff_may('settings', 'view')));
comment on policy feature_flags_select_admin on public.feature_flags is
  'Allows owner and admin, in a staff session, to read every flag (architecture 1.8.3, Settings and flags).';

alter policy settings_select_admin on public.settings
  using ((select public.staff_may('settings', 'view')));
comment on policy settings_select_admin on public.settings is
  'Allows owner and admin, in a staff session, to read every setting (architecture 1.8.3, Settings and flags).';

alter policy audit_log_select_admin on public.audit_log
  using ((select public.staff_may('audit_log', 'view')));
comment on policy audit_log_select_admin on public.audit_log is
  'Allows owner and admin, in a staff session, to read the audit log; nobody else (architecture 1.8.3).';

alter policy legal_document_versions_select_admin on public.legal_document_versions
  using ((select public.staff_may('settings', 'view')));
comment on policy legal_document_versions_select_admin on public.legal_document_versions is
  'Allows owner and admin, in a staff session, to read versions before they go live (S1-E14-01).';

alter policy invites_select_admin on public.invites
  using ((select public.staff_may('settings', 'view')));
comment on policy invites_select_admin on public.invites is
  'Allows owner and admin, in a staff session, to read invites (never the codes, stored hashed) (S1-E11-17).';

alter policy confusable_characters_select_admin on public.confusable_characters
  using ((select public.staff_may('settings', 'view')));
alter policy reserved_names_select_admin on public.reserved_names
  using ((select public.staff_may('settings', 'view')));
alter policy username_word_lists_select_admin on public.username_word_lists
  using ((select public.staff_may('settings', 'view')));
comment on policy confusable_characters_select_admin on public.confusable_characters is
  'Allows owner and admin, in a staff session, to read the look-alike table (S1-E2-04).';
comment on policy reserved_names_select_admin on public.reserved_names is
  'Allows owner and admin, in a staff session, to read reserved names, a setting (S1-E2-04).';
comment on policy username_word_lists_select_admin on public.username_word_lists is
  'Allows owner and admin, in a staff session, to read the swearword lists, a setting (S1-E2-04).';

alter policy username_approvals_select_staff on public.username_approvals
  using ((select public.staff_may('user_sanctions', 'view')));
comment on policy username_approvals_select_staff on public.username_approvals is
  'Allows owner, admin and moderator, in a staff session, to read username approvals (S1-E2-04).';

alter policy sign_in_failures_select_admin on public.sign_in_failures
  using ((select public.staff_may('settings', 'view')));
comment on policy sign_in_failures_select_admin on public.sign_in_failures is
  'Allows owner and admin, in a staff session, to read wrong log-in tries (hash and time only) (S1-E2-05).';

/* ---------- Audited changes ---------- */

/**
 * require_role_change_allowed: the checks every role or permission change shares.
 * Inputs: target_user_id; reason_given. Returns: nothing.
 * Errors: insufficient_privilege unless the caller may manage roles in a staff session, or when the
 *   caller targets themselves; check_violation for a blank reason or an account that doesn't exist.
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
    raise exception 'Only an owner or admin can change staff roles.' using errcode = 'insufficient_privilege';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Nobody can change their own role.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Give a reason.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where profiles.id = target_user_id and profiles.deleted_at is null) then
    raise exception 'There is no such account.' using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.require_role_change_allowed(uuid, text) is
  'Internal: the shared checks before a staff role or permission changes (S1-E2-07a).';
revoke execute on function public.require_role_change_allowed(uuid, text) from public, anon, authenticated;

/**
 * require_role_in_reach: may the caller grant or remove this role?
 * Input: changed_role. Errors: insufficient_privilege when an admin tries owner or admin.
 * Rule: an owner grants any role; an admin grants moderator, support and content editor only
 *   (architecture 1.8.3, Roles row).
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
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_role_in_reach(public.staff_role) is
  'Internal: refuses an admin who tries to grant or remove owner or admin (architecture 1.8.3).';
revoke execute on function public.require_role_in_reach(public.staff_role) from public, anon, authenticated;

/**
 * admin_grant_role: gives someone a staff role.
 * Inputs: target_user_id; granted_role; reason_given. Returns: true when granted, false when they
 *   already held it (nothing changes, nothing is logged).
 * Errors: see require_role_change_allowed() and require_role_in_reach().
 * Where it fits: the /staff/roles page (S1-E2-07a; moved into the admin shell by S1-E11-01).
 */
create or replace function public.admin_grant_role(
  target_user_id uuid,
  granted_role public.staff_role,
  reason_given text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
begin
  -- Step 1: who may do this, and to whom.
  perform public.require_role_change_allowed(target_user_id, reason_given);
  perform public.require_role_in_reach(granted_role);
  -- Step 2: grant it, once.
  insert into public.staff_roles (user_id, role, granted_by_user_id)
  values (target_user_id, granted_role, (select auth.uid()))
  on conflict (user_id, role) do nothing
  returning id into new_row_id;
  if new_row_id is null then
    return false;
  end if;
  -- Step 3: the audit log, in the same transaction.
  perform public.log_staff_action('staff.role_granted', 'staff_roles', new_row_id::text, target_user_id,
    reason_given, null, jsonb_build_object('role', granted_role));
  return true;
end;
$$;

comment on function public.admin_grant_role(uuid, public.staff_role, text) is
  'Gives someone a staff role, within the caller''s reach, with a reason; logged (S1-E2-07a).';

/**
 * admin_remove_role: takes a staff role away.
 * Inputs: target_user_id; removed_role; reason_given. Returns: true when removed, false when they
 *   didn't hold it.
 * Errors: as admin_grant_role(); check_violation when it would remove the last owner.
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
  if removed_role = 'owner'
    and exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id and role = 'owner')
    and (select count(*) from public.staff_roles where role = 'owner') <= 1 then
    raise exception 'The last owner can''t be removed.' using errcode = 'check_violation';
  end if;
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

comment on function public.admin_remove_role(uuid, public.staff_role, text) is
  'Takes a staff role away, never the last owner, with a reason; logged (S1-E2-07a).';

/**
 * admin_set_permission: ticks or unticks one permission for a staff member.
 * Inputs: target_user_id; changed_permission; should_hold (true to give, false to take away);
 *   reason_given. Returns: true when something changed.
 * Errors: as admin_grant_role(); check_violation when the person holds no staff role.
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
    raise exception 'Permissions are only for staff.' using errcode = 'check_violation';
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

comment on function public.admin_set_permission(uuid, public.staff_permission, boolean, text) is
  'Ticks or unticks a staff permission for someone else, with a reason; logged (S1-E2-07a).';

/**
 * admin_list_staff: everyone with a staff role, for /staff/roles.
 * Returns: one row per staff member: user ID (staff may see it, architecture 1.6), username,
 *   roles and permissions. Errors: insufficient_privilege unless the caller may view roles.
 */
create or replace function public.admin_list_staff()
returns table (user_id uuid, handle text, roles public.staff_role[], permissions public.staff_permission[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('roles', 'view') then
    raise exception 'Only an owner or admin can see the staff list.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      profiles.id,
      profiles.handle,
      array_agg(distinct staff_roles.role order by staff_roles.role),
      coalesce(
        (select array_agg(permissions.permission order by permissions.permission)
         from public.staff_permissions as permissions where permissions.user_id = profiles.id),
        '{}'
      )
    from public.staff_roles
    join public.profiles on profiles.id = staff_roles.user_id
    group by profiles.id, profiles.handle
    order by profiles.handle;
end;
$$;

comment on function public.admin_list_staff() is
  'Everyone with a staff role, their roles and permissions, for owner and admin (S1-E2-07a).';

/**
 * admin_user_id_for_handle: finds an account by its username, to grant it a role.
 * Input: wanted_handle (case and look-alikes don't matter). Returns: the user ID, or null.
 * Errors: insufficient_privilege unless the caller may manage roles.
 */
create or replace function public.admin_user_id_for_handle(wanted_handle text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('roles', 'act') then
    raise exception 'Only an owner or admin can look up accounts here.' using errcode = 'insufficient_privilege';
  end if;
  return (
    select profiles.id from public.profiles
    where profiles.handle_skeleton = public.username_skeleton(btrim(wanted_handle, ' @'))
      and profiles.deleted_at is null
  );
end;
$$;

comment on function public.admin_user_id_for_handle(text) is
  'Finds an account''s user ID by username, for granting a role (owner and admin; S1-E2-07a).';

revoke execute on function public.admin_grant_role(uuid, public.staff_role, text) from public, anon;
revoke execute on function public.admin_remove_role(uuid, public.staff_role, text) from public, anon;
revoke execute on function public.admin_set_permission(uuid, public.staff_permission, boolean, text) from public, anon;
revoke execute on function public.admin_list_staff() from public, anon;
revoke execute on function public.admin_user_id_for_handle(text) from public, anon;
grant execute on function public.admin_grant_role(uuid, public.staff_role, text) to authenticated;
grant execute on function public.admin_remove_role(uuid, public.staff_role, text) to authenticated;
grant execute on function public.admin_set_permission(uuid, public.staff_permission, boolean, text) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_user_id_for_handle(text) to authenticated;

/**
 * bootstrap_first_owner: makes the very first owner. It works once: as soon as an owner exists it
 *   refuses.
 * Input: target_user_id (copied from Supabase → Authentication → Users).
 * Who may call it: nobody through the API; only the database's own user, from the Supabase SQL
 *   editor (decided 17 Oct 2026, 19:43, Q14b). The step is in the pull request's by-hand list.
 * Errors: check_violation when an owner already exists or the account doesn't exist.
 */
create or replace function public.bootstrap_first_owner(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.staff_roles where role = 'owner') then
    raise exception 'An owner already exists; use the staff roles page.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where profiles.id = target_user_id and profiles.deleted_at is null) then
    raise exception 'There is no such account.' using errcode = 'check_violation';
  end if;
  insert into public.staff_roles (user_id, role) values (target_user_id, 'owner');
  -- No staff session exists yet, so the row is written directly, naming the new owner.
  insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, reason, after_values)
  values (target_user_id, 'staff.first_owner', 'staff_roles', target_user_id::text, target_user_id,
    'First owner, made from the SQL editor', jsonb_build_object('role', 'owner'));
end;
$$;

comment on function public.bootstrap_first_owner(uuid) is
  'Makes the first owner, once, from the SQL editor only; logged (S1-E2-07a, Q14b).';
revoke execute on function public.bootstrap_first_owner(uuid) from public, anon, authenticated;

/**
 * admin_approve_username (S1-E2-04) now asks staff_may() like every other staff action.
 */
create or replace function public.admin_approve_username(
  target_user_id uuid,
  name_kind text,
  approved_name text,
  reason_given text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  approval_id uuid;
begin
  -- Step 1: owner, admin or moderator, in a staff session (architecture 1.8.3, Users: sanctions).
  if not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only moderators can approve a name.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: save the approval (the table refuses a blank reason or an unknown kind).
  insert into public.username_approvals (
    user_id, name_kind, approved_name, approved_skeleton, approved_by_user_id, reason
  )
  values (
    target_user_id, name_kind, approved_name, public.username_skeleton(approved_name),
    (select auth.uid()), coalesce(reason_given, '')
  )
  returning id into approval_id;
  -- Step 3: the audit log, in the same transaction.
  perform public.log_staff_action(
    'username.approved', 'username_approvals', approval_id::text, target_user_id, reason_given,
    null, jsonb_build_object('name_kind', name_kind, 'approved_name', approved_name)
  );
  return approval_id;
end;
$$;

/* ---------- The account gate ---------- */

/**
 * account_state: why an account can or can't write, checked in this order:
 *   deleted (or no profile) → email_unconfirmed → staff_account (a staff role: read-only as a
 *   member, S1-E2-07a, Q14a) → age_check_failed → minor_not_admitted (adults_only on and under 18,
 *   or under 13) → awaiting_parental_consent (under 16) → age_check_pending (unless adults_only is
 *   on and the person is 18 or over by year) → handle_missing (S1-E2-04) →
 *   legal_acceptance_required (S1-E14-01) → active.
 * Decisions: the March test is invited adults only; while adults_only is on an adult is active
 * once the email is confirmed and a username chosen (decided 17 Oct 2026, 12:44). Under-16s need a
 * parent's consent (GDPR Art 8; Q15): until S1-E2-03, every under-16 stays read-only.
 * Input: target_user_id. Returns: an account_status value. Errors: none.
 * Not callable by clients: it would reveal other people's age status (privacy).
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

  -- Step 3: a staff account never writes as a member; a writer account stays separate (Q14a).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    return 'staff_account';
  end if;

  -- Step 4: the age rules (S1-E2-02, S1-E2-08, S1-E2-03).
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
  if band = '13_to_15' then
    return 'awaiting_parental_consent';
  end if;
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  -- Step 5: a username, so what the person writes can be shown with a name (S1-E2-04).
  if profile_row.handle is null then
    return 'handle_missing';
  end if;

  -- Step 6: a new important version of the terms or privacy notice must be accepted (S1-E14-01).
  if public.needs_legal_acceptance(target_user_id) then
    return 'legal_acceptance_required';
  end if;

  return 'active';
end;
$$;
