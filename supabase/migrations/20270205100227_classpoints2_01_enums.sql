/*
 * Enum values for class competitions (bundle CLASS-POINTS, part 2; stories S1-E8-15 and
 * S1-E8-19; Robert, 13 Nov 2026).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100228) uses them in its functions and tests.
 * - reportable_type 'class_competition': the name and the criteria of a class competition are
 *   words a teacher wrote for pupils, so they can be reported (CLAUDE.md rule 6; DSA art. 16).
 * - notification_kind 'class_competition_won': told to the Winner first, before the class
 *   (decision 12).
 * - notification_kind 'class_competition_results': told to every other entrant and member of the
 *   class once the results are out.
 * - notification_kind 'class_readers_choice': told to an entrant who got "Readers' choice"
 *   (decision 16).
 */
alter type public.reportable_type add value if not exists 'class_competition';
alter type public.notification_kind add value if not exists 'class_competition_won';
alter type public.notification_kind add value if not exists 'class_competition_results';
alter type public.notification_kind add value if not exists 'class_readers_choice';
