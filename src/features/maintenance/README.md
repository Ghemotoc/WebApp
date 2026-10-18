# Maintenance

The maintenance page shown while the `maintenance_mode` flag is on. Built by S1-E1-05 (board 7.4, card 3).

- `components/MaintenanceGate.tsx`: in AppLayout, around the notices and the page. While the flag is on it shows the maintenance page instead, except to a staff session and on the pages that stay open.
- `components/MaintenancePage.tsx`: "We're updating …", Check again, and the Staff sign-in link.
- `hooks/useMaintenanceMode.ts`: reads the flag every minute and on "Check again"; asks `is_staff_session()` only while the flag is on and someone is signed in. If the flag can't be read, the app stays open.
- `lib/openDuringMaintenance.ts`: log in, forgotten and new password, the email link's landing page, and the Legal centre (DSA contact points stay reachable).
- `api/maintenance.ts`: the flag and the staff check.

Switching it: in the SQL editor until the settings screen (S1-E11-03); see supabase/README.md, "Maintenance mode". It is a notice, not a lock: the database's own rules still decide what anyone may do.
