<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E2-08 (age check with Yoti). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 6 ACCOUNTS-2, part b: S1-E2-08b, manual age checks, the invitation at 18 and the 14-day clean-up (ADR 0010).

## What changed

- **Database:** `20261105110001_s1_e2_08b_enums.sql` (two notification kinds) and `20261105110002_s1_e2_08b_manual_age_checks.sql`.
  - `age_check_attempts`: one row per finished Yoti check (the line, passed or failed, the method), added by `record_age_check_result()`. The owner reads their own; kept 6 months (`purge-old-age-check-attempts`, nightly).
  - `manual_age_checks`: one open request per account, with the outcome (`passed_13`, `passed_18`, `refused`) and the reason the person reads. Who decided is only in the audit log, so the person never sees a staff name. The owner reads their own; no one writes it directly.
  - `my_age_check()` now says whether a manual check can be asked (only after a failed check, once per failure) and shows the request. `request_manual_age_check()` opens it; the account stays read-only meanwhile (criterion 7).
  - `admin_manual_age_checks()` (owner, admin and moderator; support is refused, architecture 1.8.3): open requests with the username, year and month of birth, the result now, when asked, the date to answer by (5 working days) and the attempts. Never a user ID, a photo or a document. Each row shown logs `sensitive_read.manual_age_check` (criterion 8).
  - `admin_decide_manual_age_check()`: needs a known outcome and a reason; a pass stores the result with method `manual`; a refusal changes no result; writes `manual_age_check.decided` and notifies the person with no actor. A decided request can't be decided again.
  - `invite_new_adults_to_age_check()` (nightly, 22:15 UTC, just after midnight in Romania): someone whose year of birth now says 18 but who holds only "13 or over" is invited once to the 18 check (criterion 10).
  - `erase_unchecked_accounts()` (nightly): an account still waiting 14 days after sign-up, with no manual check open, loses its personal data: the profile is marked deleted, the year and month of birth, pen name, bio and birthday are erased, sessions and identities go, the email becomes `<id>@deleted.invalid` and the login is banned. Seed personas are skipped (criterion 12). `birth_year` may now be empty only on a deleted profile.
  - `age_check_numbers()` now counts manual requests as "appealed" on the metrics page.
- **Member screens:** `ManualCheckPanel` on `/age-check` and the failed return page: "Ask for a manual check", then "A person is checking your age", or a refusal with its reason. The steps box now says the 14-day rule.
- **Staff screen:** Users › Manual age checks (`/staff/users/age-checks`), a tab only for those who act on users: one card per request with the details above, Decide, the outcome drop-down and the reason. `ReasonForm` takes an optional hint, because here the person reads the reason.
- **Notifications:** "The team checked your age by hand" (See the result) and the 18 invitation (Check my age), in-app.
- **Text:** `account.json`, `notifications.json` and `staff.json`, ro and en.
- **Docs:** ADR 0010 consequences and open points, `docs/retention.md` (attempts, requests, the 14-day erasure), `docs/mocks.md`, `docs/code-tour.md`, `supabase/README.md`, the age check and staff READMEs.

## How it was tested

- **pgTAP `200-manual-age-checks` (35 tests):** attempts recorded; asking refused before a failure and while one is open; read-only while open; both policies allowed and denied; nobody writes a request directly; members and support refused the queue; the year, attempts and answer-by date shown, never the user ID; the sensitive read logged; unknown decisions and empty reasons refused; the result stored with method manual, the audit row and the notification with no staff name; no second decision; a refusal changes nothing; the 18 invitation sent once; the 14-day erasure (kept while a request is open, then the year and email gone; personas left alone). `021-signed-out-reads` lists both tables; `184` checks the appealed count.
- **e2e `manual-age-check.spec.ts` (28 tests):** a throwaway adult fails on the stand-in, asks for a manual check and sees the open request; support sees no tab and is refused; a moderator opens the tab, sees the year of birth and "18 line, failed, selfie", and confirms 18 or over with a reason; the person then sees "Age confirmed: 18 or over · Manual check" and the notification; axe and no sideways scroll for the staff page and the open request at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: the staff page at 390 and 1440 (en) and the decision form at 768 (ro); the member page with the open request at 390 (en) and 1440 (ro). They caught the reason form's Cancel showing a raw key (the moderation texts weren't registered on this page) and a hint saying only staff read the reason; both fixed.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 956 of 956.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 110 files, 2,406 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** with `--workers=1`, `manual-age-check`, `age-check` and `invite-links` pass 71 of 71, and `notifications` and `staff-metrics` 27 of 27. The full run comes at the end of the bundle (part f).

## By hand

Nothing now. The nightly jobs start by themselves when the migration reaches staging.

## Board mismatches (AdminUsers 8.5)

- The board shows manual age checks as a panel on the users page; it is a tab of its own under Users, beside Accounts and Invites, so the year of birth shows only to those who act and each view is logged.

## Follow-ups

- OPEN (rule 13, kept out of the code): how staff verify an age by hand. The screen records only the outcome and the reason.
- The 14-day clean-up erases personal data but keeps the profile row, because many tables point to profiles; deleting the row is the account deletion story (S1-E13-05).
- The two new notifications are in-app only; emails for them come with the shared sender's templates (S1-E11-19).
- The 5 working days don't skip Romanian public holidays yet.
- Story issues for S1-E2 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
