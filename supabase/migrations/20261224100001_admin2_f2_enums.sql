/*
 * Migration: the enum value for a possible returning user (bundle ADMIN-2, part f2; Robert's brief
 * of 2 Nov 2026, section 6).
 *
 * case_source gains 'returning_user': the case a new sign-up opens when its scrambled IP address
 * matches one of an account banned in the last 30 days. It only asks a moderator to look; it never
 * blocks the sign-up (schools share IP addresses).
 * Postgres can't use a new enum value in the transaction that adds it, so the value has a
 * migration of its own; 20261224100002_admin2_f2_returning_users.sql uses it.
 * Who reads it: flag_possible_returning_user() and the moderation queue (src/features/moderation/).
 */

alter type public.case_source add value if not exists 'returning_user';
