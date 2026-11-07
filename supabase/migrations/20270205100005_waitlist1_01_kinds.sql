-- Migration: the new names the waiting list needs (bundle WAITLIST-1, story S1-E2-24).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, and the next migration (waitlist1_02) uses both values in its functions and tests.
--
-- What it adds:
--   account_status 'waitlisted'           a confirmed account still waiting for its place: it can
--                                         sign in to the holding page, but can't write, read or
--                                         post (account_state(), next migration)
--   notification_kind 'waitlist_admitted' the "You're in" notice and email when staff let a
--                                         person in (always sent, like an account notice)
--   waitlist_interest                     what the person said they come for: write, read or both
--
-- Decision: Robert, 6 Nov 2026, 17:27 UTC, chose the improved waiting list on a decision card
-- (reverses Q15, "no waiting list"). Who calls it: nothing yet; the next migration uses it.

alter type public.account_status add value if not exists 'waitlisted';
alter type public.notification_kind add value if not exists 'waitlist_admitted';

/**
 * waitlist_interest: the one sign-up question while the waiting list is on, "Do you want to
 * write, read or both?". Staff let people in by it ("writers first", WAITLIST-1).
 */
create type public.waitlist_interest as enum ('write', 'read', 'both');

comment on type public.waitlist_interest is
  'What a person on the waiting list comes for: write, read or both (WAITLIST-1, S1-E2-24).';
