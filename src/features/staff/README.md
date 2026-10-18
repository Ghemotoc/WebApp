# Staff

Staff-only pages that come before the admin shell. Started by S1-E2-07a. Plain components, no doodles (CLAUDE.md, Designs). Loaded on their own, so staff code never ships in the reader's bundle (architecture 1.8.1).

- `components/StaffRolesPage.tsx`: `/staff/roles` (decided 17 Oct 2026, 19:43, Q14c): `GrantRoleForm`, then a `StaffMemberCard` per staff member with `PermissionChecks`. Only owner and admin see the list; S1-E11-01 moves it into the admin site.
- `hooks/useStaffRoles.ts` and `api/staffRoles.ts`: `admin_list_staff()`, `admin_user_id_for_handle()`, `admin_grant_role()`, `admin_remove_role()`, `admin_set_permission()`. The database checks every rule and writes the audit log; the page only shows the choices the person has.
- `registerStaffTranslations.ts`: the `staff` text namespace, added when the page loads.
- The database side: `supabase/README.md`, "Staff roles".
