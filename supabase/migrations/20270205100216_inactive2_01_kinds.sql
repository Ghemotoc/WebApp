-- Migration: two more notification kinds for accounts nobody logs in to (bundle INACTIVE-2).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, and the next migration (inactive2_02) uses both values in its functions and tests.
--
-- What it adds:
--   notification_kind 'account_unused_nudge'   nobody has logged in for another 90 days: a plain
--                                              reminder that accounts close after a year
--                                              (always emailed)
--   notification_kind 'account_unused_closed'  the account closed today; the email says how to
--                                              download the data or keep the account during the
--                                              days before it is deleted for good (always emailed)
-- 'account_unused_month' (INACTIVE-1) stays as the notice 30 days before closing.
-- 'account_unused_week' (INACTIVE-1) is no longer sent; Postgres can't drop an enum value, so it
-- stays in the type and old rows of that kind still read as before.
--
-- Decision: Robert, 11 Nov 2026, 19:40 UTC: close after 1 year without logging in, a notice 30
-- days before (day 365, closing on day 395) and a nudge every 90 days.
-- Who calls it: nothing yet; the next migration uses it.

alter type public.notification_kind add value if not exists 'account_unused_nudge';
alter type public.notification_kind add value if not exists 'account_unused_closed';
