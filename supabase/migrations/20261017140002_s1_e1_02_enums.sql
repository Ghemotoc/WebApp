-- Migration: the shared enums (story S1-E1-02, database baseline).
--
-- What it adds: the fixed lists of values the database and the app share. The app never writes
-- these lists by hand: `npm run types:gen` copies them into src/lib/database.types.ts (rule 14).
-- Who uses them: profiles, staff_roles and the account gate functions (next migrations), and
-- later stories (reporting, age check, staff tools).
-- Adding a value later: `alter type ... add value ...` in a new migration. Values are never removed.

/**
 * reportable_type: every kind of user content that can be reported (CLAUDE.md rule 6).
 * Starts with 'profile'. Each story that adds a user-content table adds its value in the same
 * migration; the database test 002 fails when a user-content table has no matching value.
 * Used by: reports and report_item() in S1-E10-01.
 */
create type public.reportable_type as enum ('profile');

comment on type public.reportable_type is
  'Kinds of user content that can be reported; each user-content table adds its value (rule 6).';

/**
 * age_check_result: the outcome of the Yoti age check, the only age evidence we keep
 * (CLAUDE.md rule 5; S1-E2-08). 'pending' until a check is done.
 */
create type public.age_check_result as enum ('pending', '13_or_over', '18_or_over', 'failed');

comment on type public.age_check_result is
  'Yoti age check outcome; never a selfie, document or estimated age (rule 5, S1-E2-08).';

/** age_check_method: how the age check was done (S1-E2-08). */
create type public.age_check_method as enum ('facial_estimation', 'id_document', 'manual');

comment on type public.age_check_method is 'How the age check was done (S1-E2-08).';

/**
 * age_band: the age group every under-18 protection reads, from age_band() (architecture 1.7.8).
 * 'unknown' means signed out or no profile.
 */
create type public.age_band as enum ('under_13', '13_to_15', '16_to_17', '18_plus', 'unknown');

comment on type public.age_band is
  'Age group used by every under-18 protection; from age_band() (architecture 1.7.8).';

/**
 * account_status: why an account can or can't write, from account_state() (architecture 1.7.8).
 * Only 'active' may publish, comment, post or message. Later stories add values:
 * S1-E10-06 adds suspended and banned.
 */
create type public.account_status as enum (
  'active',
  'deleted',
  'email_unconfirmed',
  'age_check_pending',
  'age_check_failed',
  'awaiting_parental_consent',
  'minor_not_admitted'
);

comment on type public.account_status is
  'Why an account can or cannot write; only active may write (architecture 1.7.8).';

/** staff_role: the Stage 1 staff roles (architecture 1.8.3; S1-E2-07a). */
create type public.staff_role as enum ('owner', 'admin', 'moderator', 'support', 'content_editor');

comment on type public.staff_role is 'Stage 1 staff roles (architecture 1.8.3).';
