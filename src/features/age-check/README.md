# Age check

The Yoti age check on the web (story S1-E2-08, parts 08a and 08b; ADR 0010).

- `api/ageCheck.ts`: reads `my_age_check()` and asks our server to start a check (`POST /api/age-check/start`).
- `hooks/useMyAgeCheck.ts`: the signed-in person's check, read again every 2 seconds on the return page while a result is on its way.
- `lib/returnOutcome.ts`: which message the return page shows.
- `components/AgeCheckPage.tsx` (`/age-check`): the two methods, what we keep and "Continue with Yoti".
- `components/AgeCheckReturnPage.tsx` (`/age-check/return`): where Yoti sends the person back.
- `components/ManualCheckPanel.tsx` (part 08b): after a failed check, "Ask for a manual check"; then the open request or a refusal with its reason. Shown on both pages.
- `components/AgeCheckNotice.tsx`: "Confirm your age", shown by `AppLayout` while the account waits for a check.

The server side is in `server/age-check.ts` and `server/age-check/`; the database side in the `…_s1_e2_08a_age_check.sql` migration. While `YOTI` isn't `real`, a stand-in page plays Yoti's part (`docs/mocks.md`).
