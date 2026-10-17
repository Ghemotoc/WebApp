-- Migration: read policies for owner and admin (story S1-E1-02).
--
-- What it adds: owner and admin can read every staff role, flag and setting, including the ones
-- not marked public. Written after the account gate because each policy calls is_staff().
-- Who uses them: the admin site (S1-E11-01 shell, S1-E11-03 settings screen, S1-E2-07a roles).
-- Rule: the server decides, not the menu (architecture 1.8.1). Writes still go only through
-- audited admin functions in later stories, so there are no write policies.

/**
 * Policy staff_roles_select_admin: owner and admin read every staff role.
 * Why: only owner and admin manage roles (architecture 1.8.3, "Roles" row).
 */
create policy staff_roles_select_admin
  on public.staff_roles
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy staff_roles_select_admin on public.staff_roles is
  'Allows owner and admin to read every staff role; they manage roles (architecture 1.8.3).';

/**
 * Policy feature_flags_select_admin: owner and admin read every flag, private ones included.
 * Why: "Settings and flags: Act" for owner and admin only (architecture 1.8.3).
 */
create policy feature_flags_select_admin
  on public.feature_flags
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy feature_flags_select_admin on public.feature_flags is
  'Allows owner and admin to read every flag, private ones included (architecture 1.8.3).';

/**
 * Policy settings_select_admin: owner and admin read every setting, private ones included.
 * Why: the same row of the roles table as flags (architecture 1.8.3).
 */
create policy settings_select_admin
  on public.settings
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy settings_select_admin on public.settings is
  'Allows owner and admin to read every setting, private ones included (architecture 1.8.3).';
