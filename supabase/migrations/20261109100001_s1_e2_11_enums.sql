/*
 * Migration: the two notification kinds of the Teacher badge (story S1-E2-11; bundle ACCOUNTS-2,
 * part f).
 *
 * What it adds, on its own because Postgres can't use a new enum value in the transaction that
 * adds it:
 *   notification_kind  teacher_check_decided: the person hears that their Teacher badge request
 *                      was approved or turned down (by staff, or at once for a .edu.ro address);
 *   notification_kind  teacher_badge_removed: staff removed the badge.
 * Who uses them: …_s1_e2_11_teacher_badge.sql and src/features/notifications/.
 */
alter type public.notification_kind add value if not exists 'teacher_check_decided';
alter type public.notification_kind add value if not exists 'teacher_badge_removed';
