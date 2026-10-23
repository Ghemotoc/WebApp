# Staff

The admin site: everything under `/staff`. Started by S1-E2-07a (`/staff/roles`), given its frame by S1-E11-01. Plain components, no doodles (CLAUDE.md, Designs). Loaded only when someone opens it, so staff code never ships in the reader's bundle (architecture 1.8.1).

- `components/StaffLayout.tsx`: the frame (skip link, `StaffBar` with the areas the person may open, the page, `StaffFooter`); a member or a visitor gets `StaffAccessRefused` instead. `StaffHomePage.tsx` is `/staff`.
- `staffAreas.ts`: which area (from `staff_role_areas`) opens which page. Each staff story adds its line.
- `hooks/useMyStaffAccess.ts` and `api/staffAccess.ts`: `my_staff_areas()`, the person's own roles and username.
- `components/AuditLogPage.tsx` (`/staff/audit-log`, S1-E11-01): `AuditLogFilters`, `AuditLogTable`; `hooks/useAuditLog.ts`, `api/auditLog.ts` (`admin_search_audit_log()`, `admin_export_audit_log()`), `lib/auditLogCsv.ts` (the CSV file).
- `components/invites/InvitesPage.tsx` (`/staff/invites`, S1-E11-17): `MakeInviteForm`, `NewInviteLink` (the code, shown once), `InviteRow` with `InviteStatusPill`; `hooks/useInviteLinks.ts`, `api/inviteLinks.ts` (`admin_create_invite()`, `admin_list_invites()`, `admin_revoke_invite()`).
- `components/StaffRolesPage.tsx` (`/staff/roles`, S1-E2-07a): `GrantRoleForm`, then a `StaffMemberCard` per staff member with `PermissionChecks`; `hooks/useStaffRoles.ts`, `api/staffRoles.ts`. A role change needs a sign-in from the last 15 minutes (S1-E11-01).
- `registerStaffTranslations.ts`: the `staff` text namespace, added when the shell loads.
- The database side: `supabase/README.md`, "Staff roles" and "The admin shell". The server checks every rule and writes the audit log; the pages only show the choices the person has.
