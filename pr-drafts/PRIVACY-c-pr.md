<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-03 (Delete my account in the app). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part c: Settings › Delete account, the closing-account page and the website's /delete-account page. Board: Settings 6.3, the Delete account tab. Law: GDPR art. 17; Apple guideline 5.1.1(v) and Google Play's account deletion rule.

## What changed

- **Database** (`20261116100001_s1_e13_03_delete_my_account.sql`):
  - **The table `account_deletions`** (kind: user_action), with RLS: the person reads their own requests (`account_deletions_select_own`); every write goes through the functions. The row stays after the deletion as its record, with no personal data.
  - **`request_account_deletion()`** closes the account at once (criterion 1):
    - the profile is marked deleted, so every public page already hides it and the account gate says "deleted";
    - the live stories and comments are marked deleted with the request's own time;
    - the deletion is set for 14 days later (setting `account_deletion_days`);
    - it needs a log-in from the last 10 minutes (`account_signed_in_recently()`, from the token's `amr`, the same rule as the staff fresh sign-in), the board's "Log in again to confirm";
    - a staff account is refused until an owner removes its staff role.
  - **`cancel_account_deletion()`** brings back the profile and exactly the stories and comments the request hid. Anything the person deleted earlier stays deleted.
  - **The nightly job `purge-closed-accounts`** deletes the account for good after the 14 days, through `delete_account_data()`:
    - **stories and chapters**, keeping only a chapter under an open case or an authority's order (criterion 4); the story holding it stays hidden, and the usual purge removes it after the case;
    - **comments**; one with other people's replies keeps its place with its words erased (the body check now allows an empty body on a deleted comment);
    - **messages**, except reported ones still held; the person leaves each chat, so it goes once the other person deletes it too;
    - **pictures**, unless preserved;
    - **follows and blocks**, both ways;
    - **every other row** in the one list `account_deletion_rules()`.
  - **Kept, each with its reason in the list:**
    - moderation records (reports, cases, statements of reasons, appeals, moderator mail), for their own retention;
    - consents, as proof (how long is OPEN for the lawyer);
    - invites staff made.
  - **The user ID is never reused (criterion 3):** the profile becomes an empty tombstone and the login row stays with no email, password, identities, passkeys or sessions. The username stays reserved but is never shown.
  - **Every new user table must join the list.** Database test 211 fails when a `user_content` or `user_action` table is missing, so forum posts (S1-E8) join as kept, "Deleted user".
  - `data_export_tables()` gains `account_deletions`.
- **Screens** (`src/features/account-deletion/`):
  - **Settings › Delete account** (`#delete-account`), as a panel like the others: the board's first panel, then "Delete your account?" with the date, what happens, "Download my data first", "Log in again to confirm", "Keep my account" and "Delete my account".
  - **"Log in again to confirm"** offers only the ways the person has: each connected provider (their own logos; a provider sends the person back to this panel), "Use a passkey" when they have one, and the password when the account has one.
  - **The closing page:** while the account waits, every page except the log-in and legal pages shows "Your account is closing", the date, "Keep my account" and "Log out" (`AccountClosingGate` in AppLayout). Other devices are logged out when the account closes.
  - **`/delete-account`:** the website's deletion page for people without the app (criterion 5). Signed in, it opens Settings › Delete account.
- **Text:** a new `accountDeletion.json` in ro and en.
- **Docs:** `docs/code-tour.md`, `supabase/README.md`, `docs/retention.md` (three new rows; the "account deletion" references now point at this story; consents are kept), `docs/board-fixes.md` and the feature README.

## How it was tested

- **pgTAP `211-delete-my-account` (38 tests):**
  - **The one list:** every user table says what happens to it; anything kept says why; every table deleted row by row has a `user_id`.
  - **Asking:**
    - signed out is refused;
    - a log-in from 30 minutes ago is refused with "Log in again", and two minutes ago works;
    - a staff account is refused;
    - the deletion date is 14 days later.
  - **Closed at once:** the account gate says deleted; the stories and comments are hidden; a closing account can't ask again.
  - **Cancelling:** it brings back exactly what the request hid; a story deleted earlier stays deleted.
  - **After 14 days:**
    - only the chapter under a case is kept, with its story hidden;
    - a comment with a reply keeps its place with no words, and one under a case stays;
    - the other person's reply and their own messages stay;
    - follows go both ways, and the library and settings go too.
  - **The tombstone:** the profile and login are empty; a new account can't take the user ID; the request is marked done.
  - **Safety:** the job is scheduled, and nobody can run the deletion through the API.
  - **Policies:** each has an allowed and a denied test.
- **Vitest:** a provider's return with `mode=confirm` goes back to Delete account.
- **e2e `delete-my-account.spec.ts`:**
  - failed_check sees "Log in again to confirm" with no Delete button, logs in again with the password, deletes, sees the closing page on every page and keeps the account;
  - `/delete-account` signed out and signed in;
  - axe and no sideways scroll on the confirmation, the website page and the closing page, at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

On Node 24, locally:

- Static checks (lint, typecheck, types:check, i18n:check, migrations:check, Prettier, the third-party build check) all pass.
- Vitest: 1,011 of 1,011 pass.
- Database (pgTAP): 121 files, 2,790 tests, all pass, including the new `211-delete-my-account` (38 tests).
- Wrangler compiles the Pages Function.
- End to end (`delete-my-account`, `download-my-data`, `ways-to-log-in`, `sign-in`, `error-offline-maintenance`, `legal`, `comment-reactions`): 188 passed and 1 failed in the first run. The failure was the new spec's own selector: the page has two "Log in" links, one in the top bar. Scoped to the page, `delete-my-account` passes 38 of 38.
- Screenshots of the confirmation, the closing page and /delete-account, in ro and en, at 390 and 1440 px, were checked by eye.

## By hand

- Nothing on staging: no SQL top-up and no new secret. The migration schedules the nightly job.
- When the Play Store listing is made, its account deletion address is `<site>/delete-account`.

## Board mismatches

In `docs/board-fixes.md`:
- Delete account is a panel, not a tab.
- "Your forum posts stay, shown as Deleted user" and the certificates line are left out until those exist. The confirmation adds that moderation records are kept for their retention time.
- "Log in again" shows only the ways the person has.
- The website address comes from the brand settings.

## Questions for Robert (OPEN or not in the story, built as proposals)

- **Log in again:** within 10 minutes (`account_deletion_fresh_sign_in_minutes`). Is that right?
- **Staff accounts:** they can't delete themselves; an owner removes the staff role first.
- **Consents:** kept after the deletion as proof, until the lawyer says how long (OPEN in `docs/retention.md`).
- **Moderation records:** reports the person made or received, cases, statements and appeals stay for their own retention, pointing at the empty tombstone.
- **The username:** stays reserved for good, never shown, so nobody can take it to pretend to be the person.
- **While closing:** the other person in a chat still sees the closing person's messages until the 14 days pass.

## Follow-ups

- S1-E13-04: files in Storage (covers, avatars, chapter pictures, exports) of a deleted account stay until a clean-up through the Storage API removes them, because deleting rows doesn't delete the files. The same clean-up covers expired exports.
- S1-E13-04: the accounts the 14-day age-check clean-up erased (S1-E2-08b) can go through `delete_account_data()` too, so their other rows go.
- S1-E8: forum posts join `account_deletion_rules()` as kept, and the forum shows "Deleted user".
- The privacy notice (CMS content) should say that forum posts and moderation records are kept after deletion (L13 on the lawyer's list).
- A Canva connection's token is deleted with the account, but Canva isn't asked to revoke it (it can't be from the database). The Canva disconnect in Settings does ask.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
