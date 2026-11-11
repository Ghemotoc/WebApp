-- Migration: two more notification kinds for accounts nobody logs in to (bundle INACTIVE-2).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, and the next migration (inactive2_02) uses both values in its functions and tests.
--
-- What it adds:
--   notification_kind 'account_unused_nudge'   nobody has used the account for another year
--                                              (every 3 months in the last year): a plain
--                                              reminder that accounts close after 5 years
--                                              (always emailed)
--   notification_kind 'account_unused_closed'  the account closed today; the email says how to
--                                              download the data or keep the account during the
--                                              days before it is deleted for good (always emailed)
-- 'account_unused_month' (INACTIVE-1) stays as the notice 30 days before closing.
-- 'account_unused_week' (INACTIVE-1) is no longer sent; Postgres can't drop an enum value, so it
-- stays in the type and old rows of that kind still read as before.
--
-- Decision: Robert, 11 Nov 2026, 19:40 to 19:44 UTC: an account nobody uses for 5 calendar years
-- gets a notice, closes 30 days later and is emailed a link for downloading its data; before
-- that a nudge every year, and every 3 months from the 4th year.
-- Who calls it: nothing yet; the next migration uses it.

alter type public.notification_kind add value if not exists 'account_unused_nudge';
alter type public.notification_kind add value if not exists 'account_unused_closed';
