/**
 * Tests for typedScores (bundle CLASS-POINTS, part 2): reading the teacher's score fields.
 */
import { describe, expect, it } from 'vitest';

import type { Criterion } from '../api/classCompetitions';

import { scoresFromTyped, typedFromScores } from './typedScores';

const criteria: Criterion[] = [
  { id: 'a', label: 'Language', maxPoints: 20, description: 'd', outcomes: ['o'] },
  { id: 'b', label: 'Structure', maxPoints: 10, description: 'd', outcomes: ['o'] },
];

describe('typedScores', () => {
  it('starts each field with the saved score or empty', () => {
    expect(typedFromScores(criteria, { a: 0 })).toEqual({ a: '0', b: '' });
  });

  it('reads whole numbers and treats an empty field as a cleared score', () => {
    expect(scoresFromTyped(criteria, { a: ' 15 ', b: '' })).toEqual({ a: 15, b: null });
  });

  it('refuses a score above the criterion’s maximum', () => {
    expect(scoresFromTyped(criteria, { a: '21', b: '3' })).toBeNull();
  });

  it('refuses anything that is not a whole number', () => {
    expect(scoresFromTyped(criteria, { a: '7.5', b: '3' })).toBeNull();
    expect(scoresFromTyped(criteria, { a: '-1', b: '3' })).toBeNull();
  });
});
