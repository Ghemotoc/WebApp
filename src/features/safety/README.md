# Safety

The "Is someone in danger right now?" block: the emergency number, the children's helpline, where to report child sexual abuse material and, where one exists, a youth crisis line, for the reader's country. Started by S1-E10-13a; the editing screen and the monthly check are S1-E10-13b. No doodles: it sits on reporting screens.

- `components/SafetyContactsBlock.tsx`: the block, with `SafetyContactRow` (a phone link on touch devices, selectable text elsewhere; "Official site" in a new tab without tracking) and `CountryPicker` ("Not your country?", every covered country, Romania first; names from the browser's own list).
- `hooks/useVisitorCountry.ts`: the account's country when signed in, the connection's when signed out (`/api/signup-context`), null when unknown.
- `hooks/useSafetyContacts.ts`, `api/safetyContacts.ts`: the `safety_contacts` table (read by everyone) and `note_safety_contact_gap()` when a country has no row.
- `lib/phoneLink.ts`: `tel:` addresses and the touch-device check.
- Staff › Safety contacts (S1-E10-13b): `/staff/safety-contacts` (`SafetyContactsAdminPage`, `SafetyChecksPanel`, `SafetyContactAdminCard`, `SafetyContactForm`) for support, admins and the owner to confirm, change, add or remove a contact with its Romanian opening hours; moderators only read. `SafetyContactWarningBanner` sits at the top of every staff page while a contact is 45 days unchecked. `api/staffSafetyContacts.ts`, `hooks/useStaffSafetyContacts.ts`, `hooks/useSafetyContactWarnings.ts`.
- Where it shows: the Report dialog (S1-E10-01) and `/legal/contact`; later the public report form (S1-E10-02) and the safeguarding panel (S1-E10-10).
- The data: `content/safety-contacts.json` (research G4) → `scripts/build-safety-contacts-migration.ts` → the seed migration. Never a number from memory. The database side: `supabase/README.md`, "Safety contacts".
