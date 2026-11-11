# account-deletion

Delete my account (story S1-E13-03; board Settings 6.3, the Delete account tab; GDPR art. 17; Apple guideline 5.1.1(v) and Google Play's account deletion rule).

- `api/accountDeletion.ts`: the calls to `my_account_deletion()`, `request_account_deletion()` and `cancel_account_deletion()` (`supabase/migrations/…_s1_e13_03_delete_my_account.sql`), and logging in again with the password.
- `hooks/useAccountDeletion.ts`: where the account stands, "Delete my account", "Keep my account" and "Log in again to confirm" (password, passkey or a connected provider).
- `components/DeleteAccountSection.tsx`: the Settings panel (`#delete-account`); `DeleteAccountConfirm.tsx` is the second panel and `ConfirmLogIn.tsx` its "Log in again to confirm".
- `components/AccountClosingGate.tsx` and `ClosingAccountPage.tsx`: while the account waits to be deleted, every page but the log-in and legal pages shows "Your account is closing" with "Keep my account" and "Log out".
- `components/DeleteAccountPage.tsx`: `/delete-account`, the website's deletion page for people without the app.

How it works: the account closes at once (hidden everywhere, nothing can be written) and the nightly job `purge-closed-accounts` deletes it for good 14 days later, keeping only content under an open case. What happens to each table is in one list, `account_deletion_rules()`; database test 211 fails when a new user table is missing from it.

Accounts nobody uses (INACTIVE-1): the nightly job `close-unused-accounts` emails a notice about a month and about a week before an account reaches 5 years without use, then closes it the same way (`hide_closing_account()`, reason `unused`), so the same closing page and "Keep my account" apply. Nothing on screen is new; the database side is `…_inactive1_02_unused_accounts.sql`.
