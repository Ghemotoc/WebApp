/*
 * Migration: the notification kinds of "Ways to log in" (story S1-E2-09; bundle ACCOUNTS-2,
 * part e).
 *
 * What it adds, on its own because Postgres can't use a new enum value in the transaction that
 * adds it:
 *   notification_kind  login_method_added: a way to log in (Google, Apple, Microsoft or a passkey)
 *                      was connected to the account (criterion 4: "an email confirms it");
 *   notification_kind  login_method_removed: one was disconnected.
 * Both are account and safety notices, always emailed, so a stranger who connects their own
 * Google account to someone else's can't do it unseen.
 * Who uses them: …_s1_e2_09_ways_to_log_in.sql, server/notification-emails.ts and
 * src/features/notifications/.
 */
alter type public.notification_kind add value if not exists 'login_method_added';
alter type public.notification_kind add value if not exists 'login_method_removed';
