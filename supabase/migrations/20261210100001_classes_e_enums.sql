/*
 * Enums for writing certificates (bundle CLASSES, part e; story S1-E8-12).
 * In its own file because Postgres can't use a value added to an enum in the same transaction that
 * adds it; the next migration (20261210100002) uses them.
 * - certificate_result: what a student's certificate says they did in a class programme (and,
 *   later, a contest, S1-E12-02): took part, reached the final or won.
 * - notification_kind 'certificate_issued': a student's new certificate is under "My
 *   certificates" (criterion 1).
 * - notification_kind 'class_archived': the teacher is told, in the app and by email, to keep their
 *   own copies of the class's certificates within 30 days, before the printed names are deleted
 *   (criterion 3; decided 17 Oct 2026, 12:44).
 */
create type public.certificate_result as enum ('participant', 'finalist', 'winner');
comment on type public.certificate_result is
  'What a certificate says the student did: took part, reached the final or won (S1-E8-12).';

alter type public.notification_kind add value if not exists 'certificate_issued';
alter type public.notification_kind add value if not exists 'class_archived';
