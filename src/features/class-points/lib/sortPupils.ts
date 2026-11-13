/**
 * Sorting the teacher's class points table (bundle CLASS-POINTS, part 1; story S1-E8-14).
 *
 * The teacher may sort by name or by either number; the table never shows a rank number, and
 * pupils with the same number stay in name order so the table doesn't shuffle. Who calls it:
 * ClassPointsTable.
 */
import type { TablePupil } from '../api/classPointsTable';

/** What the table is sorted by. */
export type PupilSort = 'name' | 'class' | 'teacher';

/**
 * The pupils in the chosen order.
 *
 * @param pupils - the pupils by name, as the database answers them
 * @param sort - "name" keeps that order; "class" and "teacher" put the larger number first
 * @returns a new list; the given one is left as it is
 */
export function sortedPupils(pupils: TablePupil[], sort: PupilSort): TablePupil[] {
  if (sort === 'name') return [...pupils];
  const numberOf = (pupil: TablePupil) =>
    sort === 'class' ? pupil.classPoints : pupil.teacherPoints;
  // Array.sort is stable, so equal numbers keep the name order they came in.
  return [...pupils].sort((first, second) => numberOf(second) - numberOf(first));
}
