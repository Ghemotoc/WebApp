/*
 * Migration: the notification kind for a landing page's Remind me (bundle CONTESTS, part a2b;
 * story S1-E11-14 criterion 8).
 *
 * notification_kind gains 'landing_entries_open': the one in-app notification a signed-in reader
 * asked for with a Remind me block, sent when the page's entries open. Postgres can't use a new
 * enum value in the transaction that adds it, so the value has a migration of its own;
 * 20270103100002_contests_a2b_remind_me.sql uses it.
 * Who reads it: send_landing_reminders() and the notifications page.
 */

alter type public.notification_kind add value if not exists 'landing_entries_open';
