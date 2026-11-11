-- Migration: the two notices an unused account gets before it is deleted (bundle INACTIVE-1).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, and the next migration (inactive1_02) uses both values in its functions and tests.
--
-- What it adds:
--   notification_kind 'account_unused_month'  nobody has used the account for almost 5 years: it
--                                             will be deleted in about a month unless someone
--                                             logs in (always emailed)
--   notification_kind 'account_unused_week'   the last notice, about a week before (always emailed)
--
-- Decision: Robert, 11 Nov 2026, 17:08 UTC: "add a 5 year no utilisation self deletion of account
-- automation". Who calls it: nothing yet; the next migration uses it.

alter type public.notification_kind add value if not exists 'account_unused_month';
alter type public.notification_kind add value if not exists 'account_unused_week';
