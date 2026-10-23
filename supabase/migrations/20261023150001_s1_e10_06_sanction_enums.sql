-- Migration: the enum values sanctions need (story S1-E10-06; architecture 1.7.8, the account
-- gate; 1.7.11, the shared contract is_moderated_away()).
--
-- Why a migration of its own: Postgres can't use a new enum value in the same transaction that
-- adds it, so the values come first and the next migration (…_s1_e10_06_sanctions.sql) uses them.
-- What it adds:
--   account_status      suspended and banned, answered by account_state() from the next migration
--   moderation_action   hide (decided 23 Oct 2026, Q3: hidden = the writer and staff still see it;
--                       removed = staff only, with a "[Removed by the moderation team]" marker)
--   sanction_kind       warning, suspension, ban, reporting_pause
--   moderated_state     hidden, removed
-- Who uses them: the sanctions migration, the case page's decision form (the actions list is read
-- from the generated types) and the database tests.

alter type public.account_status add value if not exists 'suspended';
alter type public.account_status add value if not exists 'banned';

alter type public.moderation_action add value if not exists 'hide' before 'remove';

/** sanction_kind: what a sanction is (S1-E10-06; decided 23 Oct 2026, Q7, proposals accepted). */
create type public.sanction_kind as enum ('warning', 'suspension', 'ban', 'reporting_pause');

comment on type public.sanction_kind is
  'A warning (a record only), a suspension (1, 7 or 30 days), a ban (for good, with the email blocked) or a reporting pause (30 days) (S1-E10-06).';

/** moderated_state: what staff did to a reported item (S1-E10-06; decided 23 Oct 2026, Q3). */
create type public.moderated_state as enum ('hidden', 'removed');

comment on type public.moderated_state is
  'hidden: the writer and staff still see it; removed: staff only, a marker stays for everyone else (S1-E10-06, Q3).';
