<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 13 CONTESTS, part a2b: Remind me on landing pages (S1-E11-14 criterion 8). The link preview for shared /c/ links and notice banners pointing at a landing page follow in part a2c.

## What changed

- **A Remind me block** (a heading and an optional introduction in both languages). A page may have one, and only with a Key dates block, because the reminder is for the day entries open.
- **Tapping it.** A signed-in reader taps "Remind me" and the block says when they will be reminded; "Don't remind me" cancels. A visitor who isn't signed in is asked to log in. Once entries are open the block just says so. No countdown and no "only today", in line with the story's note on copy aimed at minors.
- **One notification, nothing else.** An hourly job sends each reminder once, on the day entries open (Romanian time), as an in-app notification that names the page in the reader's language and opens it. No email and no second reminder. A sent reminder is deleted after 30 days.
- **Records:** retention schedule row, a builder proposal row in decisions, the code tour and the feature's README. Download my data includes the reminders and deleting an account deletes them.

## How it was tested

- Database test 263 (23 tests): publishing refused for a Remind me block without key dates and for two of them; a visitor is asked to sign in; a reader sets it once (asking twice changes nothing) and cancels it; the policy lets a reader read their own reminder and not someone else's; nobody writes the table directly; a page without the block; nothing sent before entries open, then exactly one notification per reader that names the page, no email and never a second one; nobody can ask once entries are open; the export and deletion lists cover the table. Test 021 lists the new table as invisible to visitors.
- Unit test: the notification names the page in the reader's language and links to it.
- e2e `e2e/landing-remind-me.spec.ts`: the log-in prompt for visitors; a reader asks, cancels and asks again; after the job, the page says entries are open and the notification leads to the page; axe on the page at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Run on the branch head (Node 24, local Supabase), after rebasing onto main with #308:

- lint, prettier, typecheck, types:check, i18n:check, migrations:check, third-party check: pass
- `npm test` (Vitest): 220 files, 1379 tests, all pass
- `npx supabase db reset && npx supabase test db`: 173 files, 4174 tests, all pass
- `wrangler pages functions build`: compiles
- `npx playwright test e2e/landing-remind-me.spec.ts e2e/landing-pictures-featured.spec.ts e2e/notifications.spec.ts`: 28 passed

The full end-to-end run comes once at the end of bundle 13 (Robert's choice, 30 Oct 2026). GitHub Actions is still blocked by billing, so this merges on the local run and the Cloudflare build.

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing. The hourly job is scheduled by the migration.

## Board mismatches

- None: no board draws landing pages yet.

## Questions for Robert

None blocking. Please read the new Romanian text in `src/locales/ro/landingPages.json` (remindMe) and `src/locales/ro/notifications.json`.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
