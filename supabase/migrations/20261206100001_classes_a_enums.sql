/*
 * Enum for class spaces (bundle CLASSES, part a; story S1-E8-11).
 * In its own file because Postgres can't use a new type's values in the same transaction that
 * makes them in every case; the next migration (20261206100002) uses it.
 * - space_kind: an open space anyone in its age group can find and join (S1-E8-06), or a private
 *   class space a teacher runs, joined only with the teacher's invite code (S1-E8-11).
 */
create type public.space_kind as enum ('open', 'class');
comment on type public.space_kind is
  'An open space (S1-E8-06) or a private class space joined by invite code only (S1-E8-11).';
