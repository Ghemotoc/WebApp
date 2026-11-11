/*
 * Migration: custom staff roles (story S1-E11-33, bundle CMS-2a).
 *
 * Why: the five built-in staff roles (owner, admin, moderator, support, content editor) are fixed
 * in staff_role_areas, so a new kind of staff member, such as someone in marketing, needed a
 * migration. Robert asked on 8 Nov 2026 that the owner or an admin can make a role and choose what
 * it may do. A custom role is a name, a short description and, per admin area, View or Change.
 *
 * Rules (research doc "Research: CMS-2 page builder and custom staff roles"; architecture 1.8.3):
 * - Only staff who may change roles (area 'roles': owner and admin) make, change, remove, give or
 *   take back custom roles, with a reason and a recent sign-in, never for themselves.
 * - An admin may only put in a role what the admin holds, at the level they hold it, and may only
 *   change, remove or give a role that sits wholly within their reach. Only the owner may put the
 *   'roles' area in a custom role.
 * - Safeguarding, removal orders and opening a market never go in a custom role: they need a
 *   trained or on-call person (their per-person permissions) or carry the legal check of a market.
 * - A person whose only staff access is a custom role counts as staff (is_staff()), so they get a
 *   staff session and are left out of member counts like other staff.
 * - Every change is in the audit log with the before and after areas.
 *
 * What it adds: staff_custom_roles, staff_custom_role_areas, staff_custom_role_holders; the helper
 *   custom_role_assignable_areas(); is_staff() and staff_may() learn about custom roles;
 *   my_staff_areas() lists their areas; admin_custom_roles(), admin_save_custom_role(),
 *   admin_remove_custom_role() and admin_set_custom_role_holder().
 * Who calls it: the Custom roles part of Staff › Roles (src/features/staff/components/CustomRoles*).
 */

/* ---------- Tables ---------- */

create table public.staff_custom_roles (
  id uuid primary key default gen_random_uuid(),
  -- The staff member who made the role (the owner column, CLAUDE.md conventions).
  user_id uuid not null references public.profiles (id),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  description text not null default '' check (char_length(description) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A removed role keeps its row for the audit trail; it gives nobody anything.
  deleted_at timestamptz
);

comment on table public.staff_custom_roles is
  'kind: staff
Custom staff roles made by an owner or admin: a name and a description; what each may do is in staff_custom_role_areas (S1-E11-33, CMS-2a).';

-- Two live roles can't share a name, whatever the capitals or spaces.
create unique index staff_custom_roles_name_key
  on public.staff_custom_roles (lower(btrim(name))) where deleted_at is null;

create table public.staff_custom_role_areas (
  custom_role_id uuid not null references public.staff_custom_roles (id) on delete cascade,
  -- The staff member who last saved the role's areas (staff tables carry a user_id, test 002).
  user_id uuid not null references public.profiles (id),
  area text not null,
  -- 'view' lets the holder look; 'act' (Change on screen) also lets them change things.
  access text not null check (access in ('view', 'act')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (custom_role_id, area)
);

comment on table public.staff_custom_role_areas is
  'kind: staff
What a custom staff role may do in each admin area: view or act (S1-E11-33, CMS-2a).';

create table public.staff_custom_role_holders (
  id uuid primary key default gen_random_uuid(),
  custom_role_id uuid not null references public.staff_custom_roles (id) on delete cascade,
  -- The person who holds the role (like staff_roles.user_id).
  user_id uuid not null references public.profiles (id) on delete cascade,
  granted_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (custom_role_id, user_id)
);

comment on table public.staff_custom_role_holders is
  'kind: staff
Who holds which custom staff role, and who gave it (S1-E11-33, CMS-2a).';

create index staff_custom_role_holders_user_idx on public.staff_custom_role_holders (user_id);

create trigger staff_custom_roles_set_updated_at before update on public.staff_custom_roles
  for each row execute function public.set_updated_at();
create trigger staff_custom_role_areas_set_updated_at before update on public.staff_custom_role_areas
  for each row execute function public.set_updated_at();
create trigger staff_custom_role_holders_set_updated_at before update on public.staff_custom_role_holders
  for each row execute function public.set_updated_at();

alter table public.staff_custom_roles enable row level security;
alter table public.staff_custom_role_areas enable row level security;
alter table public.staff_custom_role_holders enable row level security;

/* ---------- Who counts as staff ---------- */

/**
 * is_staff: does the signed-in person hold a staff role?
 * Inputs: required_role, one built-in role, or null for any staff access at all.
 * Returns: true when the caller holds that built-in role; with null, also when they hold a live
 *   custom role (S1-E11-33), so a custom-role-only person gets a staff session like other staff.
 * Where it fits: is_staff_session(), the account gate and everything that leaves staff out of
 *   member counts.
 */
create or replace function public.is_staff(required_role public.staff_role default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles
    join public.profiles on profiles.id = staff_roles.user_id
    where staff_roles.user_id = (select auth.uid())
      and profiles.deleted_at is null
      and (required_role is null or staff_roles.role = required_role)
  )
  or (
    required_role is null
    and exists (
      select 1
      from public.staff_custom_role_holders as holders
      join public.staff_custom_roles as custom_roles
        on custom_roles.id = holders.custom_role_id and custom_roles.deleted_at is null
      join public.profiles on profiles.id = holders.user_id and profiles.deleted_at is null
      where holders.user_id = (select auth.uid())
    )
  );
$$;

/* ---------- What a custom role may hold ---------- */

/**
 * custom_role_assignable_areas: the admin areas a custom role may hold at all.
 * Returns: every area the built-in roles use, except safeguarding and removal orders (they need
 *   their per-person permission) and opening a market (owner only, it carries the legal check).
 * Where it fits: staff_may() reads custom roles only for these, and the save checks against them.
 */
create or replace function public.custom_role_assignable_areas()
returns table (area text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct staff_role_areas.area
  from public.staff_role_areas
  where staff_role_areas.area not in ('safeguarding', 'removal_orders', 'open_market')
  order by staff_role_areas.area;
$$;

comment on function public.custom_role_assignable_areas() is
  'Internal: the admin areas a custom staff role may hold (not safeguarding, removal orders or opening a market; S1-E11-33).';

revoke execute on function public.custom_role_assignable_areas() from public, anon, authenticated;

/**
 * staff_may: may the signed-in person do this in this admin area?
 * Inputs: target_area (for example 'settings'); wanted_access, 'view' or 'act' (act includes view).
 * Returns: true only when the session is a staff session AND either one of the caller's built-in
 *   roles allows it (with the permission the row needs, if any) or one of their live custom roles
 *   holds the area at that level (S1-E11-33; never for safeguarding, removal orders or opening a
 *   market). False when signed out.
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
  select public.is_staff_session() and (
    exists (
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
    )
    or (
      target_area not in ('safeguarding', 'removal_orders', 'open_market')
      and exists (
        select 1
        from public.staff_custom_role_holders as holders
        join public.staff_custom_roles as custom_roles
          on custom_roles.id = holders.custom_role_id and custom_roles.deleted_at is null
        join public.staff_custom_role_areas as custom_areas
          on custom_areas.custom_role_id = custom_roles.id
        join public.profiles on profiles.id = holders.user_id and profiles.deleted_at is null
        where holders.user_id = (select auth.uid())
          and custom_areas.area = target_area
          and (wanted_access = 'view' or custom_areas.access = 'act')
      )
    )
  );
$$;

comment on function public.staff_may(text, text) is
  'True when the caller''s staff role (and permission) or custom role allows the area and the session is a staff session (architecture 1.8.3, S1-E2-07a, S1-E11-33).';

/**
 * my_staff_areas: the admin areas the caller may use, for the admin menu.
 * Returns: one row per area with 'act' or 'view', from the built-in roles' areas (custom roles hold
 *   only those, so nothing is missed). Empty outside a staff session.
 */
create or replace function public.my_staff_areas()
returns table (area text, access text)
language sql
stable
security definer
set search_path = ''
as $$
  select areas.area, case when public.staff_may(areas.area, 'act') then 'act' else 'view' end
  from (select distinct staff_role_areas.area from public.staff_role_areas) as areas
  where public.staff_may(areas.area, 'view')
  order by areas.area;
$$;

/* ---------- Policies ---------- */

/**
 * staff_custom_roles_select_role_staff: staff who may see roles (owner and admin) read every custom
 * role, removed ones included, for the Roles page. Members and other staff read none: the roles
 * and who holds them are staff business. Writes go only through the admin_* functions below.
 */
create policy staff_custom_roles_select_role_staff on public.staff_custom_roles
  for select to authenticated
  using ((select public.staff_may('roles', 'view')));

/** staff_custom_role_areas_select_role_staff: the same people read what each role may do. */
create policy staff_custom_role_areas_select_role_staff on public.staff_custom_role_areas
  for select to authenticated
  using ((select public.staff_may('roles', 'view')));

/**
 * staff_custom_role_holders_select_role_staff: the same people read who holds which role; a holder
 * also reads their own rows, so the admin shell can tell them what they hold.
 */
create policy staff_custom_role_holders_select_role_staff on public.staff_custom_role_holders
  for select to authenticated
  using ((select public.staff_may('roles', 'view')) or user_id = (select auth.uid()));

grant select on public.staff_custom_roles to authenticated;
grant select on public.staff_custom_role_areas to authenticated;
grant select on public.staff_custom_role_holders to authenticated;

/* ---------- Helpers for the admin functions ---------- */

/**
 * custom_role_area_in_reach: may the caller put this area, at this level, in a custom role?
 * Inputs: the area and the level ('view' or 'act').
 * Returns: true for an assignable area the caller holds at that level; the 'roles' area only for
 *   the owner.
 */
create or replace function public.custom_role_area_in_reach(wanted_area text, wanted_access text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.custom_role_assignable_areas() as assignable
                 where assignable.area = wanted_area)
    and wanted_access in ('view', 'act')
    and public.staff_may(wanted_area, wanted_access)
    and (wanted_area <> 'roles' or public.is_staff('owner'));
$$;

comment on function public.custom_role_area_in_reach(text, text) is
  'Internal: true when the caller may put this area at this level in a custom role (S1-E11-33).';

revoke execute on function public.custom_role_area_in_reach(text, text) from public, anon, authenticated;

/**
 * custom_role_in_reach: does every area of this custom role sit within the caller's reach?
 * Inputs: the role's id. Returns: true when the caller could have made it themselves.
 * Where it fits: an admin may only change, remove or give a role they could have made.
 */
create or replace function public.custom_role_in_reach(target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.staff_custom_role_areas as custom_areas
    where custom_areas.custom_role_id = target_role_id
      and not public.custom_role_area_in_reach(custom_areas.area, custom_areas.access)
  );
$$;

comment on function public.custom_role_in_reach(uuid) is
  'Internal: true when every area of the custom role is within the caller''s reach (S1-E11-33).';

revoke execute on function public.custom_role_in_reach(uuid) from public, anon, authenticated;

/**
 * require_custom_role_staff: refuses anyone who may not manage custom roles.
 * Inputs: reason_given, which must not be empty. Raises insufficient_privilege (hint not_allowed),
 *   invalid_authorization_specification (sign_in_again) or check_violation (reason_missing).
 */
create or replace function public.require_custom_role_staff(reason_given text)
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
  -- A role change needs a sign-in from the last 15 minutes (S1-E11-01, as for built-in roles).
  if not public.staff_signed_in_recently() then
    raise exception 'Sign in again to change a staff role.'
      using errcode = 'invalid_authorization_specification', hint = 'sign_in_again';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Give a reason.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
end;
$$;

comment on function public.require_custom_role_staff(text) is
  'Internal: refuses anyone who may not manage custom staff roles, or gives no reason (S1-E11-33).';

revoke execute on function public.require_custom_role_staff(text) from public, anon, authenticated;

/**
 * custom_role_areas_json: one custom role's areas as [{area, access}], sorted by area.
 * Inputs: the role's id. Returns: a jsonb array (empty when it holds none).
 */
create or replace function public.custom_role_areas_json(target_role_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('area', custom_areas.area, 'access', custom_areas.access)
                            order by custom_areas.area), '[]'::jsonb)
  from public.staff_custom_role_areas as custom_areas
  where custom_areas.custom_role_id = target_role_id;
$$;

comment on function public.custom_role_areas_json(uuid) is
  'Internal: a custom staff role''s areas as a jsonb list, for the Roles page and the audit log (S1-E11-33).';

revoke execute on function public.custom_role_areas_json(uuid) from public, anon, authenticated;

/* ---------- What the Roles page reads ---------- */

/**
 * admin_custom_roles: the custom roles, who holds each, and what the caller may put in one.
 * Returns: {roles: [{id, name, description, areas, holders: [{user_id, handle}], in_reach}],
 *   assignable: [{area, highest}]} where highest is the most the caller may give ('view' or 'act').
 * Errors: insufficient_privilege (hint not_allowed) for anyone but staff who may see roles.
 * Where it fits: the Custom roles part of Staff › Roles.
 */
create or replace function public.admin_custom_roles()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  role_list jsonb;
  assignable_list jsonb;
begin
  -- Step 1: only staff who may see roles.
  if not public.staff_may('roles', 'view') then
    raise exception 'Only an owner or admin can see staff roles.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: every live role with its areas and holders, by name.
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', custom_roles.id,
      'name', custom_roles.name,
      'description', custom_roles.description,
      'areas', public.custom_role_areas_json(custom_roles.id),
      'in_reach', public.custom_role_in_reach(custom_roles.id),
      'holders', (
        select coalesce(jsonb_agg(jsonb_build_object('user_id', profiles.id, 'handle', profiles.handle)
                                  order by profiles.handle), '[]'::jsonb)
        from public.staff_custom_role_holders as holders
        join public.profiles on profiles.id = holders.user_id and profiles.deleted_at is null
        where holders.custom_role_id = custom_roles.id
      )
    ) order by lower(custom_roles.name)), '[]'::jsonb)
  into role_list
  from public.staff_custom_roles as custom_roles
  where custom_roles.deleted_at is null;
  -- Step 3: the areas the caller could put in a role, and at what level at most.
  select coalesce(jsonb_agg(jsonb_build_object('area', assignable.area, 'highest',
      case when public.custom_role_area_in_reach(assignable.area, 'act') then 'act' else 'view' end)
    order by assignable.area), '[]'::jsonb)
  into assignable_list
  from public.custom_role_assignable_areas() as assignable
  where public.custom_role_area_in_reach(assignable.area, 'view');
  return jsonb_build_object('roles', role_list, 'assignable', assignable_list);
end;
$$;

comment on function public.admin_custom_roles() is
  'The custom staff roles with their areas and holders, and what the caller may put in one; owner and admin only (S1-E11-33).';

revoke execute on function public.admin_custom_roles() from public, anon;
grant execute on function public.admin_custom_roles() to authenticated;

/* ---------- Making, changing and removing a role ---------- */

/**
 * custom_role_area_problem: what is wrong with a role's areas, or null.
 * Inputs: new_areas, a jsonb array of {area, access}.
 * Returns: 'bad_areas' (not a list of known areas and levels, or an area twice), 'no_areas' or
 *   'area_out_of_reach:<area>'; null when every area is fine.
 */
create or replace function public.custom_role_area_problem(new_areas jsonb)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entry jsonb;
  seen text[] := '{}';
begin
  -- Step 1: a non-empty list.
  if new_areas is null or jsonb_typeof(new_areas) <> 'array' then
    return 'bad_areas';
  end if;
  if jsonb_array_length(new_areas) = 0 then
    return 'no_areas';
  end if;
  -- Step 2: each entry names an area once, at a level the caller may give.
  for entry in select value from jsonb_array_elements(new_areas) loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry -> 'area') <> 'string'
       or (entry ->> 'area') = any (seen) then
      return 'bad_areas';
    end if;
    seen := seen || (entry ->> 'area');
    if not public.custom_role_area_in_reach(entry ->> 'area', entry ->> 'access') then
      return 'area_out_of_reach:' || left(entry ->> 'area', 40);
    end if;
  end loop;
  return null;
end;
$$;

comment on function public.custom_role_area_problem(jsonb) is
  'Internal: names what is wrong with a custom role''s areas for this caller, or null (S1-E11-33).';

revoke execute on function public.custom_role_area_problem(jsonb) from public, anon, authenticated;

/**
 * admin_save_custom_role: makes a custom role, or changes one.
 * Inputs: target_role_id (null to make a new one), new_name (2 to 40 characters, not used by
 *   another live role), new_description (up to 200), new_areas ([{area, access}], at least one,
 *   each within the caller's reach), reason_given.
 * Returns: the role's id.
 * Errors: insufficient_privilege (not_allowed, role_out_of_reach), invalid_authorization_specification
 *   (sign_in_again), check_violation (reason_missing, bad_name, name_taken, no_areas, bad_areas,
 *   area_out_of_reach:<area>, no_such_role).
 * Where it fits: the role form on Staff › Roles. A change applies to every holder at once.
 */
create or replace function public.admin_save_custom_role(
  target_role_id uuid,
  new_name text,
  new_description text,
  new_areas jsonb,
  reason_given text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := btrim(coalesce(new_name, ''));
  clean_description text := btrim(coalesce(new_description, ''));
  area_problem text;
  areas_before jsonb;
  saved_id uuid := target_role_id;
begin
  -- Step 1: who may, with a reason, and a name and areas that hold up.
  perform public.require_custom_role_staff(reason_given);
  if char_length(clean_name) not between 2 and 40 or char_length(clean_description) > 200 then
    raise exception 'Give the role a name of 2 to 40 characters and a description of up to 200.'
      using errcode = 'check_violation', hint = 'bad_name';
  end if;
  area_problem := public.custom_role_area_problem(new_areas);
  if area_problem is not null then
    raise exception 'That role''s areas can''t be saved.' using errcode = 'check_violation', hint = area_problem;
  end if;
  if exists (select 1 from public.staff_custom_roles as others
             where lower(btrim(others.name)) = lower(clean_name) and others.deleted_at is null
               and others.id is distinct from target_role_id) then
    raise exception 'Another role has that name.' using errcode = 'check_violation', hint = 'name_taken';
  end if;
  -- Step 2: a new role, or a change to one the caller could have made.
  if target_role_id is null then
    insert into public.staff_custom_roles (user_id, name, description)
    values ((select auth.uid()), clean_name, clean_description)
    returning id into saved_id;
  else
    if not exists (select 1 from public.staff_custom_roles
                   where id = target_role_id and deleted_at is null) then
      raise exception 'There is no such role.' using errcode = 'check_violation', hint = 'no_such_role';
    end if;
    if not public.custom_role_in_reach(target_role_id) then
      raise exception 'That role holds more than you do.' using errcode = 'insufficient_privilege', hint = 'role_out_of_reach';
    end if;
    areas_before := public.custom_role_areas_json(target_role_id);
    update public.staff_custom_roles set name = clean_name, description = clean_description
    where id = target_role_id;
    delete from public.staff_custom_role_areas where custom_role_id = target_role_id;
  end if;
  -- Step 3: the areas, then the audit log in the same transaction.
  insert into public.staff_custom_role_areas (custom_role_id, user_id, area, access)
  select saved_id, (select auth.uid()), entry ->> 'area', entry ->> 'access'
  from jsonb_array_elements(new_areas) as entry;
  perform public.log_staff_action(
    case when target_role_id is null then 'staff.custom_role_created' else 'staff.custom_role_changed' end,
    'staff_custom_roles', saved_id::text, null, reason_given, areas_before,
    jsonb_build_object('name', clean_name, 'areas', public.custom_role_areas_json(saved_id)));
  return saved_id;
end;
$$;

comment on function public.admin_save_custom_role(uuid, text, text, jsonb, text) is
  'Makes or changes a custom staff role within the caller''s reach, with a reason; logged (S1-E11-33).';

revoke execute on function public.admin_save_custom_role(uuid, text, text, jsonb, text) from public, anon;
grant execute on function public.admin_save_custom_role(uuid, text, text, jsonb, text) to authenticated;

/**
 * admin_remove_custom_role: removes a custom role, taking it from everyone who holds it.
 * Inputs: target_role_id, reason_given. Returns: true when it was removed, false when it was gone.
 * Errors: as admin_save_custom_role (not_allowed, sign_in_again, reason_missing, role_out_of_reach).
 */
create or replace function public.admin_remove_custom_role(target_role_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder_ids jsonb;
begin
  -- Step 1: who may, and only a live role within reach.
  perform public.require_custom_role_staff(reason_given);
  if not exists (select 1 from public.staff_custom_roles where id = target_role_id and deleted_at is null) then
    return false;
  end if;
  if not public.custom_role_in_reach(target_role_id) then
    raise exception 'That role holds more than you do.' using errcode = 'insufficient_privilege', hint = 'role_out_of_reach';
  end if;
  -- Step 2: take it from its holders and mark it removed; the row stays for the audit trail.
  select coalesce(jsonb_agg(holders.user_id), '[]'::jsonb) into holder_ids
  from public.staff_custom_role_holders as holders where holders.custom_role_id = target_role_id;
  delete from public.staff_custom_role_holders where custom_role_id = target_role_id;
  update public.staff_custom_roles set deleted_at = now() where id = target_role_id;
  -- Step 3: the audit log.
  perform public.log_staff_action('staff.custom_role_removed', 'staff_custom_roles', target_role_id::text,
    null, reason_given,
    jsonb_build_object('areas', public.custom_role_areas_json(target_role_id), 'holders', holder_ids), null);
  return true;
end;
$$;

comment on function public.admin_remove_custom_role(uuid, text) is
  'Removes a custom staff role and takes it from its holders, with a reason; logged (S1-E11-33).';

revoke execute on function public.admin_remove_custom_role(uuid, text) from public, anon;
grant execute on function public.admin_remove_custom_role(uuid, text) to authenticated;

/* ---------- Giving and taking back ---------- */

/**
 * admin_set_custom_role_holder: gives someone a custom role, or takes it back.
 * Inputs: target_user_id, target_role_id, should_hold (true to give), reason_given.
 * Returns: true when something changed, false when it already was so.
 * Errors: as admin_grant_role (not_allowed, sign_in_again, own_role, reason_missing,
 *   no_such_account, no_workspace_account), plus no_such_role and role_out_of_reach.
 * Where it fits: the holders list of a role on Staff › Roles.
 */
create or replace function public.admin_set_custom_role_holder(
  target_user_id uuid,
  target_role_id uuid,
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
  domain text := public.staff_email_domain();
begin
  -- Step 1: the same checks as a built-in role (who, recent sign-in, never oneself, a reason).
  perform public.require_role_change_allowed(target_user_id, reason_given);
  if not exists (select 1 from public.staff_custom_roles where id = target_role_id and deleted_at is null) then
    raise exception 'There is no such role.' using errcode = 'check_violation', hint = 'no_such_role';
  end if;
  if not public.custom_role_in_reach(target_role_id) then
    raise exception 'That role holds more than you do.' using errcode = 'insufficient_privilege', hint = 'role_out_of_reach';
  end if;
  -- Step 2: give it, once; once staff sign in through Google Workspace, only to a Workspace account.
  if should_hold then
    if domain is not null and not public.has_workspace_account(target_user_id, domain) then
      raise exception 'This account has not signed in with a Google Workspace account on the staff domain.'
        using errcode = 'check_violation', hint = 'no_workspace_account';
    end if;
    insert into public.staff_custom_role_holders (custom_role_id, user_id, granted_by_user_id)
    values (target_role_id, target_user_id, (select auth.uid()))
    on conflict (custom_role_id, user_id) do nothing
    returning id into changed_row_id;
  else
    delete from public.staff_custom_role_holders
    where custom_role_id = target_role_id and user_id = target_user_id
    returning id into changed_row_id;
  end if;
  if changed_row_id is null then
    return false;
  end if;
  -- Step 3: the audit log, in the same transaction.
  perform public.log_staff_action(
    case when should_hold then 'staff.custom_role_granted' else 'staff.custom_role_taken_back' end,
    'staff_custom_role_holders', changed_row_id::text, target_user_id, reason_given, null,
    jsonb_build_object('custom_role_id', target_role_id));
  return true;
end;
$$;

comment on function public.admin_set_custom_role_holder(uuid, uuid, boolean, text) is
  'Gives someone a custom staff role or takes it back, within the caller''s reach, never for themselves; logged (S1-E11-33).';

revoke execute on function public.admin_set_custom_role_holder(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_custom_role_holder(uuid, uuid, boolean, text) to authenticated;
