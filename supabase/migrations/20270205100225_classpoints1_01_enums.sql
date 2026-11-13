/*
 * Enum values for class points (bundle CLASS-POINTS, part 1; stories S1-E8-13 and S1-E8-14;
 * Robert, 13 Nov 2026).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100226) uses them in its functions and tests.
 * - reportable_type 'class_point_note': the one-line note a pupil may add when giving points to a
 *   classmate's chapter. The writer of the chapter reads it, so it is text written for someone
 *   else and can be reported like a comment (CLAUDE.md rule 6; DSA art. 16).
 * - reportable_type 'class_teacher_note': the private note a teacher may leave with their points
 *   on a pupil's work. The pupil reads it and can report it.
 */
alter type public.reportable_type add value if not exists 'class_point_note';
alter type public.reportable_type add value if not exists 'class_teacher_note';
