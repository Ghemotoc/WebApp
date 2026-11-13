# Account

The signed-in person's own account: their username and pen name, setup after sign-up, and Settings. Started by S1-E2-04.

- `components/SetupForm.tsx`: the username (required) and the pen name (optional), shown by the onboarding page (`/setup`, `src/features/onboarding/`, S1-E2-06) to an older account without a username. Since 25 Oct 2026 the username is chosen on the sign-up form (`HandleField` there too).
- `components/SettingsPage.tsx`: `/settings` (board 6.3), split into groups by PROFILE-1 (6 Nov 2026): `SettingsNav` (the side menu), `SettingsGroupPanel` (which panels each group shows), `lib/settingsGroups.ts` (the groups and the older panel addresses each one holds) and `hooks/useSettingsGroup.ts` (the open group comes from the address's hash, so /settings#privacy and older links such as /settings#teacher-badge work). The panels: "Signed in as …", `AccountNamesSection` (with `HandleSettingsForm` and `PenNameSettingsForm`), `EmailSettingsSection` (the owner's own email and changing it with two 6-digit codes, S1-E2-05: `NewEmailForm`, `EmailCodesForm` with `EmailCodeField`, `hooks/useMyEmail.ts`, `hooks/useEmailChangeCodes.ts`, `api/emailAddress.ts`), `BirthdaySettingsSection` (the optional birthday, S1-E2-12: `BirthdayForm`, `BirthdayPicker`, `hooks/useMyBirthday.ts`, `api/birthday.ts`), `LoginMethodsSection` with `LoginMethodRow` (Settings › Ways to log in, S1-E2-09: `hooks/useLoginMethods.ts`, `hooks/useLoginMethodRows.ts`, `api/loginMethods.ts`; its text is `src/locales/<language>/loginMethods.json`, added by `registerLoginMethodsTranslations.ts` when the section first renders so it stays out of the first page's download), `SignedInDevicesSection` with `DeviceRow` (S1-E2-05, `hooks/useMySessions.ts`) and `LegalLinksSection`. Later stories add the other panels.
- `components/HandleField.tsx`, `PenNameField.tsx`: the two name fields; `AskForReviewLink.tsx` offers a moderator's review of a false hit.
- `components/SetupProfileNotice.tsx`: "Choose a username" on every page for a signed-in person without one (the database keeps them read-only, `handle_missing`).
- `components/SanctionNotice.tsx`, `hooks/useMySanctions.ts` (S1-E10-06): "Your account is suspended until …" or "Your reporting is paused until …" on every page, from `my_sanctions()` (kind and dates only, never the staff note).
- `hooks/useMyNames.ts` (the names and the save calls), `useNamesForm.ts` (the form state), `useHandleCheck.ts` (the live check).
- `api/accountNames.ts`: `profiles`, the public settings, `check_handle()`, `set_my_handle()`, `set_my_pen_name()`.
- `lib/nameRules.ts`: the quick rules the form answers at once, `displayName()` and `nextChangeDate()`; `lib/outcomeMessages.ts`: the sentences.
- The database side: `supabase/README.md`, "Usernames and pen names".

The country the member lives in (MARKETS-1):
- `components/CountrySetting.tsx` (Settings › Account) and `CountryChangeForm.tsx` (the form it holds). Members are never asked where they live: the country comes from the connection at sign-up (Robert, 8 Nov 2026).
- `api/myCountry.ts` and `hooks/useMyCountry.ts`: `set_my_country()`, which checks the new country's age rule first.
