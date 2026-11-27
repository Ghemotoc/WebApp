/**
 * Tests for resultsDraft (BOOKS-8, part 8b; board G12): the results page's sums.
 */
import { describe, expect, it } from 'vitest';

import type { Criterion } from '../api/classCompetitions';
import type { ScoringEntrant } from '../api/competitionScoring';

import {
  changedScores,
  readersChoiceOf,
  sharedTotals,
  typedTotal,
  winnerOf,
  withResult,
} from './resultsDraft';

const criteria: Criterion[] = [
  { id: 'a', label: 'Language', maxPoints: 10, description: 'd', outcomes: ['o'] },
  { id: 'b', label: 'Structure', maxPoints: 5, description: 'd', outcomes: ['o'] },
];

/** An entrant with the given class points and saved scores. */
function entrant(handle: string, classPoints: number, scores = {}): ScoringEntrant {
  return {
    handle,
    displayName: handle,
    classPoints,
    teacherPoints: 0,
    chapters: [],
    scores,
    result: null,
    isReadersChoice: false,
  };
}

describe('typedTotal', () => {
  it('adds the typed scores once every criterion has one', () => {
    expect(typedTotal(criteria, { a: '9', b: '4' })).toBe(13);
  });

  it('has no total while a field is empty or not a score', () => {
    expect(typedTotal(criteria, { a: '9', b: '' })).toBeNull();
    expect(typedTotal(criteria, { a: '11', b: '4' })).toBeNull();
  });
});

describe('sharedTotals', () => {
  it('marks only the entrants who share a total', () => {
    expect(sharedTotals({ andra: 22, lia: 19, teo: 22, vlad: null })).toEqual(
      new Set(['andra', 'teo']),
    );
  });
});

describe('readersChoiceOf', () => {
  it('names the entrants with the most class points who aren’t the Winner', () => {
    const entrants = [entrant('andra', 17), entrant('teo', 21), entrant('mara', 21)];
    expect(readersChoiceOf(entrants, 'teo')).toEqual(['mara']);
    expect(readersChoiceOf(entrants, null)).toEqual(['teo', 'mara']);
  });

  it('names nobody when nobody received class points', () => {
    expect(readersChoiceOf([entrant('andra', 0)], null)).toEqual([]);
  });
});

describe('withResult', () => {
  it('keeps exactly one Winner', () => {
    const chosen = withResult({ andra: 'winner', teo: 'finalist' }, 'teo', 'winner');
    expect(chosen).toEqual({ andra: 'participant', teo: 'winner' });
    expect(winnerOf(chosen)).toBe('teo');
    expect(winnerOf({ andra: 'finalist' })).toBeNull();
  });
});

describe('changedScores', () => {
  it('sends only the entrants whose scores changed', () => {
    const entrants = [entrant('andra', 0, { a: 9, b: 4 }), entrant('teo', 0, { a: 8 })];
    const typed = { andra: { a: '9', b: '4' }, teo: { a: '8', b: '3' } };
    expect(changedScores(criteria, entrants, typed)).toEqual([
      { handle: 'teo', scores: { a: 8, b: 3 } },
    ]);
  });

  it('saves nothing when a field isn’t a score', () => {
    expect(changedScores(criteria, [entrant('andra', 0)], { andra: { a: 'x' } })).toBeNull();
  });
});
