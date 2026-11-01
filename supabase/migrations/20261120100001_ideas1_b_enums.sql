/*
 * Enum values for the private reading streak (bundle IDEAS-1, part b; idea IDEA-20261031-13).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20261120100002) uses it.
 * - notification_kind 'reading_reminder': the one gentle reminder a reader can ask for, on a day
 *   they haven't yet read their daily minutes.
 */
alter type public.notification_kind add value if not exists 'reading_reminder';
