/**
 * The address of the page where a closed, unused account downloads its data (bundle INACTIVE-2).
 *
 * Why one constant: the closing email links here after logging in (server/notification-emails.ts),
 * the router serves it (src/app/router.tsx) and AccountClosingGate treats it as the one page that
 * doesn't keep the account (Robert, 11 Nov 2026, 19:43 UTC: downloading alone doesn't keep it).
 * Who uses it: those three. What it calls: nothing.
 */
export const ACCOUNT_CLOSING_PATH = '/account-closing';
