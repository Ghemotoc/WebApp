# PRIVACY-c plan: S1-E13-03 Delete my account

## How it works

- **Close at once.** `request_account_deletion()` marks the profile deleted (every public read already hides a deleted profile, and the account gate says "deleted", so nothing can be written), and marks the live stories and comments deleted with the request's own time. Needs a log-in within 10 minutes (`account_signed_in_recently()`, from the token's `amr`, the same rule as staff fresh sign-in). Refuses a staff account.
- **Cancel within 14 days.** `cancel_account_deletion()` brings back the profile and exactly the stories and comments carrying the request's time.
- **Delete for good.** Nightly `purge-closed-accounts` → `delete_account_data()`:
  - stories and chapters, keeping only what `content_is_held_for_moderation()` holds (the story stays, hidden, while a chapter in it is held);
  - comments (one with other people's replies keeps its row with its words erased; the body check allows an empty body once deleted), messages (except `held_message_ids()`), the person's place in each chat, pictures (except preserved ones);
  - follows and blocks both ways;
  - every `delete` table of the one list `account_deletion_rules()`;
  - `erase_closed_account()`: profile tombstone (username kept reserved, never shown), login row kept with no email, password, identities, passkeys or sessions, so the user ID is never reused.
- **Kept:** moderation records (reports, cases, statements, appeals, moderator mail), consents (OPEN for the lawyer), invites staff made, the `account_deletions` row as the record.
- **The one list:** `account_deletion_rules()`; test 211 fails when a user_content or user_action table is missing (forum posts join as kept with S1-E8).

## Screens

- Settings › Delete account (`#delete-account`): the board's first panel, then the confirmation with "Log in again to confirm" (only the ways the person has: connected providers, passkey, password), "Keep my account" and "Delete my account".
- `AccountClosingGate` in AppLayout: a closing account sees "Your account is closing" with "Keep my account" and "Log out" on every page except log-in and legal pages.
- `/delete-account`: the website deletion page (criterion 5); signed in, it opens Settings.
- A provider's return with `mode=confirm` goes back to `/settings#delete-account`.

## Tests

- pgTAP 211 (38): the list, fresh log-in, staff refusal, close at once, policy allowed and denied, cancel restores exactly what it hid, purge deletes everything but held content, reply kept with words erased, tombstone, user ID can't be reused, job scheduled, function not callable.
- Vitest: social return with mode=confirm.
- e2e `delete-my-account.spec.ts`: log in again with the password, close, closing page everywhere, keep; `/delete-account` signed out and signed in; axe on the confirmation, the website page and the closing page.

## Proposals for Robert

- 10 minutes for "log in again"; a staff account can't delete itself; consents kept after deletion (OPEN); the username stays reserved; reports and moderation records kept for their own retention; files in Storage of a deleted account are a follow-up for S1-E13-04.
