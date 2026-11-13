/**
 * Tests for criteriaDraft (bundle CLASS-POINTS, part 2): the pure list helpers behind the
 * criteria editor and the totals on the results page.
 */
import { describe, expect, it } from 'vitest';

import type { Criterion } from '../api/classCompetitions';

import {
  copiedCriteria,
  emptyCriterion,
  maxTotal,
  pointsFromTyped,
  totalOf,
  withCriterion,
  withOutcome,
  withoutCriterion,
  withoutOutcome,
} from './criteriaDraft';

const language: Criterion = {
  id: 'a',
  label: 'Language',
  maxPoints: 20,
  description: 'How the text is written.',
  outcomes: ['uses dialogue', 'varies sentence length'],
};
const structure: Criterion = { ...language, id: 'b', label: 'Structure', maxPoints: 10 };

describe('criteriaDraft', () => {
  it('starts a criterion with one empty outcome line', () => {
    expect(emptyCriterion().outcomes).toEqual(['']);
  });

  it('changes one criterion and leaves the others and the old list alone', () => {
    const list = [language, structure];
    const changed = withCriterion(list, 1, { label: 'Plot' });
    expect(changed[1]?.label).toBe('Plot');
    expect(changed[0]).toBe(language);
    expect(list[1]?.label).toBe('Structure');
  });

  it('removes a criterion by position', () => {
    expect(withoutCriterion([language, structure], 0)).toEqual([structure]);
  });

  it('changes and removes one outcome line', () => {
    expect(withOutcome(language, 0, 'shows character').outcomes[0]).toBe('shows character');
    expect(withoutOutcome(language, 0).outcomes).toEqual(['varies sentence length']);
  });

  it('reads whole points and turns anything else into 0', () => {
    expect(pointsFromTyped(' 25 ')).toBe(25);
    expect(pointsFromTyped('2.5')).toBe(0);
    expect(pointsFromTyped('ten')).toBe(0);
  });

  it('copies a template’s criteria without their row IDs', () => {
    const copies = copiedCriteria([language]);
    expect(copies[0]?.id).toBeNull();
    expect(copies[0]?.outcomes).not.toBe(language.outcomes);
  });

  it('adds the maximums and totals only a full set of scores', () => {
    expect(maxTotal([language, structure])).toBe(30);
    expect(totalOf([language, structure], { a: 15, b: 7 })).toBe(22);
    expect(totalOf([language, structure], { a: 15 })).toBeNull();
  });
});
