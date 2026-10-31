<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E2-08 (age check with Yoti). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 6 ACCOUNTS-2, part a: S1-E2-08a, the age check on the web, built against a Yoti stand-in until GO-LIVE (ADR 0010). Manual checks and the 14-day clean-up are part b.

## What changed

- **Database:** `20261105100001_s1_e2_08a_age_check.sql`.
  - `age_check_sessions`: one row per account linking it to a Yoti session while the check runs (session ID, the line checked, expiry after 30 minutes). RLS: the owner reads their own row; no one writes it directly.
  - `my_age_check()`: the caller's result, date and method, the line a new check tests (18 when the year of birth says 18 or over, otherwise 13), whether one can start, whether one is on its way and whether the account waits for one. Never the year of birth.
  - `begin_age_check()` (as the person) and `record_age_check_result()` (as a visitor, from the webhook): each acts only on a payload signed with HMAC-SHA256 and the Vault secret `age_check_secret`, checked by `age_check_is_signed()`. The result keeps only `age_check_result`, `age_checked_at` and `age_check_method` and deletes the session row (criterion 5; CLAUDE.md rule 5).
  - `purge_expired_age_check_sessions()`, hourly by pg_cron, removes abandoned sessions (criterion 11).
- **Server:** `server/age-check.ts` with `functions/api/age-check/[[path]].ts` (and the local route in `server/pages-functions-plugin.ts`).
  - `POST start` with the person's sign-in creates the session (API key and SDK ID only in Cloudflare; a random reference that is never stored) and answers only the session ID, the SDK ID and the page to open (criterion 1). Both methods, facial estimation and an ID document, nothing else (criterion 2).
  - `POST webhook` checks Yoti's RSA-PSS signature before anything else, fetches the result from Yoti itself and stores it signed (criterion 4). No service key anywhere.
  - `server/age-check/stub.ts`: while `YOTI` isn't `real`, a stand-in page with Pass with a selfie, Pass with an ID document, Fail and Cancel; its pages answer 404 in real mode.
- **Screens:** `src/features/age-check/`.
  - `/age-check`: "Confirm your age", the two methods, what we keep, "Continue with Yoti" and the three steps beside it. A check already done shows its result.
  - `/age-check/return`: "Checking your age" while the result is on its way (read every 2 seconds, for up to a minute), then Age confirmed (with "Use an ID document" for an adult year with only "13 or over", criterion 6), We couldn't confirm your age (Try again), You stopped the check or The check wasn't finished (Start again).
  - `AgeCheckNotice` in `AppLayout`: "Confirm your age" on every page while the account waits for a check. Hidden while `adults_only` is on, because no invited adult waits for one.
- **Text:** `ageCheck` in `account.json`, ro and en.
- **Docs:** ADR 0010, `docs/mocks.md` (the Yoti stand-in), `docs/code-tour.md`, `supabase/README.md`, the feature README.
- **Also fixed:** `npm run third-party:check` failed on `main` since Story Atlas, because the Atlas help text shows `https://example.com` and "starts with http:// or https://." The check now skips a bare `https://.` and lists `example.com` as a sample link that is never loaded.

## How it was tested

- **pgTAP `199-age-check` (27 tests):** the owner reads their own session and no one else's; unsigned or wrongly signed writes refused; the 13 and 18 lines; a start for someone who can't start; passes, failures and an earlier pass kept; the manual method refused; the session row gone after the result; the purge job. `021-signed-out-reads` now lists the new table (0 rows for visitors).
- **Vitest:** `server/age-check.test.ts` (11: the start answers only three fields and signs the link; signed out 401; nothing to check 409; no secret or no Yoti credentials 503; an unsigned notification refused before the database; the stored result signed with our secret; no stand-in pages in real mode; Yoti's result and signature read correctly) and `returnOutcome.test.ts`.
- **e2e `age-check.spec.ts` (27 tests):** a throwaway adult account starts a check, passes with an ID document on the stand-in and comes back to "Age confirmed: 18 or over", with only the result, the date and the method stored and the session row gone; a failure shows Try again; a cancel shows Start again and stores nothing; axe and no sideways scroll on both pages at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye at 1440 (en), 768 (en) and 390 (ro): the start page, the stand-in, the passed page and the cancelled page.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check all pass.
- **Unit tests:** `npx vitest run` passes 956 of 956.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 109 files, 2,371 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `age-check.spec.ts` passes 27 of 27 with `--workers=1`. The full run comes at the end of the bundle (part f).

## By hand

Nothing now. At GO-LIVE (in ADR 0010 and `docs/mocks.md`): Yoti's contract and data processing agreement, `YOTI=real`, `YOTI_API_KEY`, `YOTI_SDK_ID`, `YOTI_NOTIFICATION_PUBLIC_KEY` and `AGE_CHECK_SECRET` in Cloudflare, the same `AGE_CHECK_SECRET` in Vault as `age_check_secret`, the webhook address registered with Yoti, and Yoti in the privacy notice. The stand-in lets anyone pass, so this must happen before `adults_only` goes off.

## Board mismatches (AgeCheck.dc.html)

- The board has the person choose Quick selfie or ID document on our page. Yoti's hosted page offers both and the person chooses there, so our page explains the two methods instead of asking.
- The board opens Yoti in a new tab. The web version goes to Yoti in the same tab and Yoti sends the person back to the return page, which works the same on phones; the desktop app (after March) opens the system browser.
- "Ask for a manual check" and the 14-day line come with part b; the "Under 16? Next we email a parent" step comes with parental consent (part c).
- The board says "come back to Ghemotoc"; the text says "come back here", because the product name is a setting (CLAUDE.md).

## Follow-ups

- Yoti's addresses, request fields, signature header and salt length were written from Yoti's documentation and must be checked against it in Yoti's sandbox before go-live (ADR 0010).
- OPEN (rule 13, kept out of the code): the age buffer at the 13 line, whether Yoti also checks the 16 line, and Yoti's price and contract.
- Story issues for S1-E2 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
