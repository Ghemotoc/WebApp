# account-deletion

Delete my account (story S1-E13-03; board Settings 6.3, the Delete account tab; GDPR art. 17; Apple guideline 5.1.1(v) and Google Play's account deletion rule).

- `api/accountDeletion.ts`: the calls to `my_account_deletion()`, `request_account_deletion()` and `cancel_account_deletion()` (`supabase/migrations/…_s1_e13_03_delete_my_account.sql`), and logging in again with the password.
- `hooks/useAccountDeletion.ts`: where the account stands, "Delete my account", "Keep my account" and "Log in again to confirm" (password, passkey or a connected provider).
- `components/DeleteAccountSection.tsx`: the Settings panel (`#delete-account`); `DeleteAccountConfirm.tsx` is the second panel and `ConfirmLogIn.tsx` its "Log in again to confirm".
- `components/AccountClosingGate.tsx` and `ClosingAccountPage.tsx`: while the account waits to be deleted, every page but the log-in and legal pages shows "Your account is closing" with "Keep my account" and "Log out".
- `components/DeleteAccountPage.tsx`: `/delete-account`, the website's deletion page for people without the app.

How it works: the account closes at once (hidden everywhere, nothing can be written) and the nightly job `purge-closed-accounts` deletes it for good 14 days later, keeping only content under an open case. What happens to each table is in one list, `account_deletion_rules()`; database test 211 fails when a new user table is missing from it.

Accounts nobody uses (INACTIVE-1, INACTIVE-2): the nightly job `close-unused-accounts` emails a nudge after 1, 2 and 3 years without use and every 3 months from 4 years, a notice at 5 years, and closes the account 30 days after that notice the same way as "Delete my account" (`hide_closing_account()`, reason `unused`). The closing email links, through the log-in page, to `/account-closing` (`src/lib/account-closing-path.ts`).

- `components/AccountClosingGate.tsx` tells the two kinds of closing apart (`my_account_deletion()` answers the reason). An account the person asked to delete sees the closing page on every page. An unused one sees it only at `/account-closing`; opening any other page keeps the account (`components/KeepByUsing.tsx`), because the person is using the site again (Robert, 11 Nov 2026, 19:43 UTC).
- `components/ClosingAccountPage.tsx` also shows Download data (`features/data-export`, without Download my stories), loaded only there. A closing account can still make its copy; downloading doesn't keep it.
- `components/AccountClosingRedirect.tsx`: what `/account-closing` shows to anyone whose account isn't closing (the log-in page, or Settings › Download data).

The database side is `…_inactive1_02_unused_accounts.sql` and `…_inactive2_02_nudges_and_closing.sql`; tests `369`, `370` and `e2e/unused-account-closing.spec.ts`.
