## Story
WAITLIST-1: the waiting list (story S1-E2-24, added to `docs/stories/s1-e02-…` in this PR)

Robert asked for a waiting list in the Builder thread on 6 Nov 2026, 17:25 to 17:27 UTC, and picked the improved version on his decision card. It replaces "the 'not open yet' page keeps no email" (Q15 of the epic S1-E2 plan) while the `waitlist` flag is on. There is no GitHub issue to close.

## What changed
- **Database** (`…_waitlist1_01_kinds.sql`, `…_waitlist1_02_waitlist.sql`):
  - New flag `waitlist` (on) and new table `waitlist_entries`, with RLS: people read their own entry, and only owner and admin read every entry. Grants are select only.
  - New `account_status` value 'waitlisted'. `account_state()` returns it after the staff check, so a staff account never waits.
  - `create_profile_from_sign_up()` step 5 calls `join_waitlist_at_sign_up()`. With an invite code, the entry starts admitted, so the code skips the queue. Everyone who joins while the list is on gets `profiles.founding_member_since`.
  - The news opt-in reuses `marketing_email_opt_in`, and is kept only for people 18 or over (Q50).
  - New functions: `my_waitlist()`, `set_my_waitlist_interest()`, `admin_waitlist()`, `admin_admit_from_waitlist()` and `admin_admit_waitlist_wave()`. A wave takes confirmed emails only, oldest first, filtered by answer and country.
  - Letting someone in sends a required `waitlist_admitted` notice and email, and writes the audit log (`waitlist.admitted`).
  - Existing functions updated:
    - `may_change_own_avatar()` allows waiting accounts;
    - `staff_dashboard()` gets a waiting count;
    - `get_writer_profile()` gets `is_founding_member`;
    - Download my data includes the entry, and account deletion removes it.
- **Sign-up**:
  - With no code, the same form is headed "Join the waiting list". It asks "What do you want to do here?" (Write, Read or Both) and shows a separate news box, never pre-ticked.
  - The confirmation step and email say "You're on the list". This works in `server/send-email.ts` and in the local Auth template (`scripts/build-auth-email-templates.ts`).
  - Someone with an invite code isn't asked the question. The email field moved to `SignUpEmailField`, to keep the form within the line limit.
- **Holding page** (`src/features/waitlist/`): `WaitlistGate` shows `WaitlistHoldingPage` in place of every page except sign-in, legal, help, Contact us, support and Settings. On the holding page people can:
  - change their answer;
  - build their avatar;
  - pick favourite genres;
  - open Settings, or log out.
- **Staff › Waitlist** (`/staff/waitlist`, owner and admin, in the People group):
  - counts by answer;
  - filters by answer and country;
  - a "Let in a wave" form with a confirm step;
  - a table where staff tick people and let them in, which never shows the user ID or the email;
  - a dashboard tile.
- **"You're in"**: an in-app notice linking to Discover, and an email with a sign-in link, never a code.
- **Founding member badge** on writer profiles.
- **News emails switch** in Settings › Notifications.
- **Docs**:
  - decisions row (Q15 reversal);
  - story S1-E2-24;
  - architecture 1.8.2 and 1.8.3;
  - retention (3 rows);
  - `docs/for-the-lawyer.md` (privacy notice paragraph, news consent, 7-day rule, badge);
  - code tour, waitlist and staff READMEs, `supabase/README.md`.

## Acceptance criteria and tests
| Criterion | Test |
| --- | --- |
| No code: the question, the news box, "You're on the list" | `SignUpPage.test.tsx`, `signUp.test.ts`, `send-email.test.ts`, `e2e/waitlist-1.spec.ts` |
| A code skips the queue, with no question | pgTAP `310-waitlist`, `SignUpPage.test.tsx` |
| A waiting account can't write, read or post; holding page; Settings open | pgTAP `310-waitlist`, `e2e/waitlist-1.spec.ts` |
| Staff › Waitlist: counts, filters, tick, wave; a moderator is refused; no user ID | pgTAP `310-waitlist` (48), `waitlist.test.ts`, `e2e/waitlist-1.spec.ts` |
| "You're in" notice and email, audit log | pgTAP `310-waitlist`, `notification-emails.test.ts`, `e2e/waitlist-1.spec.ts` |
| Founding member badge | pgTAP `310-waitlist` |
| Staff never wait | pgTAP `310-waitlist` |
| Deleted with the account, and in Download my data | pgTAP `310-waitlist` |
| Menu entry and dashboard tile | `staffAreas.test.ts`, `staffDashboard.test.ts` |
| axe and no sideways scroll at 390, 768 and 1440 px, light and night, ro and en | `e2e/waitlist-1.spec.ts` (24 views) |
| The old invitation gate still works with the list off | `e2e/sign-up.spec.ts`, `e2e/epic-s1-e2.spec.ts` (flag turned off there) |

Screenshots of the sign-up form, holding page and Staff › Waitlist at 1440, 768 and 390 px are in the project's builder screenshots folder (`waitlist-1/`).

## Definition of Done
- [x] CI green
- [x] RLS: allowed and denied tests
- [x] Strings in ro and en
- [x] axe clean, keyboard checked
- [x] No personal data in logs or analytics
- [ ] Reportable and blockable (not applicable: not user content)
- [x] Retention and lawyer notes updated
- [ ] Tested on staging by a person

## Checks
Full local run on the final branch (Supabase local, fresh database before the database tests and before each browser rerun):

| Check | Result |
|---|---|
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run types:check` | passed |
| `npm test` | 261 files, 1,612 tests passed |
| `npx supabase db reset` + `npm run schema:check` | passed |
| `npx supabase test db` | 220 files, 4,961 tests passed |
| `npm run test:e2e` | 2,666 tests in three runs (see below): all passed |
| `npm run i18n:check` | passed |
| `npm run migrations:check` | passed |
| `npm run build` + `npm run bundle:check` | first load 269 KB (budget 280), chapter reader 334 KB (budget 345) |
| `npm run third-party:check` | passed |

The browser tests ran in three parts, because the single run stopped at its 90-minute limit after 1,768 tests:
1. First 1,768 tests: 13 failures. On a fresh database, 10 of those 13 files passed again (leftover rows from earlier tests). The real one was the staff menu lists, which now include Waitlist for the owner and admins (`staff-shell.spec.ts`, `epic-s1-e11.spec.ts`).
2. The remaining 61 files plus the three still red (`epic-s1-e11`, `notifications`, `reader-performance`): 870 passed. One failure was `website-cms.spec.ts`, from leftover state.
3. `website-cms.spec.ts` on a fresh database: 53 passed.

Also fixed while checking: the first download went over budget (281 KB), so the holding page is now fetched only for someone who waits; the sign-up schema tests send the two new answers; the data download's guide names the waiting list table.

## By hand
- The flag is on from its migration, so after merge staging sign-ups without a code join the waiting list. Existing staging accounts have no entry, so they are unaffected.
- Nothing to copy for Auth emails: staging sends them through the Send Email hook (`server/send-email.ts`), which picks the waiting list's wording itself. The local template change is for development only.
- The privacy notice needs a new paragraph (see `docs/for-the-lawyer.md`). Robert publishes a new legal version when ready.
- Robert reads the new Romanian text (sign-up, holding page, emails, Staff › Waitlist).

## Follow-ups
- Unconfirmed accounts still go after 7 days (the existing rule). Robert asked for 30, so this needs his call before changing `unconfirmed_account_days`.
- Invited people aren't asked "write, read or both", so their entry is stored as "both".

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
