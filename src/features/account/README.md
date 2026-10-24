# Account

The signed-in person's own account: their username and pen name, setup after sign-up, and Settings. Started by S1-E2-04.

- `components/SetupPage.tsx` and `SetupForm.tsx`: `/setup`, "Set up your profile" (board 2.5, step 1): the username (required) and the pen name (optional). Someone who already has a username is sent home.
- `components/SettingsPage.tsx`: `/settings` (board 6.3): "Signed in as …", `AccountNamesSection` (with `HandleSettingsForm` and `PenNameSettingsForm`), `SignedInDevicesSection` with `DeviceRow` (S1-E2-05, `hooks/useMySessions.ts`) and `LegalLinksSection`. Later stories add the other panels.
- `components/HandleField.tsx`, `PenNameField.tsx`: the two name fields; `AskForReviewLink.tsx` offers a moderator's review of a false hit.
- `components/SetupProfileNotice.tsx`: "Choose a username" on every page for a signed-in person without one (the database keeps them read-only, `handle_missing`).
- `components/SanctionNotice.tsx`, `hooks/useMySanctions.ts` (S1-E10-06): "Your account is suspended until …" or "Your reporting is paused until …" on every page, from `my_sanctions()` (kind and dates only, never the staff note).
- `hooks/useMyNames.ts` (the names and the save calls), `useNamesForm.ts` (the form state), `useHandleCheck.ts` (the live check).
- `api/accountNames.ts`: `profiles`, the public settings, `check_handle()`, `set_my_handle()`, `set_my_pen_name()`.
- `lib/nameRules.ts`: the quick rules the form answers at once, `displayName()` and `nextChangeDate()`; `lib/outcomeMessages.ts`: the sentences.
- The database side: `supabase/README.md`, "Usernames and pen names".
