/*
 * Enum value for assignment due dates in class spaces (bundle MUST-1, part d; IDEA-20261108-8,
 * "Due dates for class assignments"; story S1-E8-11).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100054) uses it in its functions and tests.
 * - notification_kind 'assignment_due': the one reminder a student who hasn't replied gets the
 *   day before an assignment is due.
 */
alter type public.notification_kind add value if not exists 'assignment_due';
