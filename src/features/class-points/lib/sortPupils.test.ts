/**
 * Tests for sorting the teacher's class points table (bundle CLASS-POINTS, part 1; story
 * S1-E8-14).
 */
import { describe, expect, it } from 'vitest';

import type { TablePupil } from '../api/classPointsTable';

import { sortedPupils } from './sortPupils';

/**
 * A pupil with the two numbers.
 *
 * @returns the pupil
 */
function pupil(handle: string, classPoints: number, teacherPoints: number): TablePupil {
  return { handle, displayName: handle, classPoints, teacherPoints, chapters: [] };
}

const byName = [pupil('ana', 3, 9), pupil('bogdan', 5, 2), pupil('carmen', 3, 9)];

describe('sortedPupils', () => {
  it('keeps the name order the database sent', () => {
    expect(sortedPupils(byName, 'name').map((row) => row.handle)).toEqual([
      'ana',
      'bogdan',
      'carmen',
    ]);
  });

  it('puts the larger class points first and keeps equal pupils in name order', () => {
    expect(sortedPupils(byName, 'class').map((row) => row.handle)).toEqual([
      'bogdan',
      'ana',
      'carmen',
    ]);
  });

  it('sorts by teacher points without changing the list it was given', () => {
    expect(sortedPupils(byName, 'teacher').map((row) => row.handle)).toEqual([
      'ana',
      'carmen',
      'bogdan',
    ]);
    expect(byName.map((row) => row.handle)).toEqual(['ana', 'bogdan', 'carmen']);
  });
});
