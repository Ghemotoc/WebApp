/**
 * Tests for sorting the Featured ranking table (story S1-E5-10, criterion 2): sorting only
 * reorders what staff see, a missing value goes last and the ranks themselves never change.
 */
import { describe, expect, it } from 'vitest';

import type { FeaturedCandidate } from '../../api/featured';

import { sortedCandidates } from './featuredColumns';

/**
 * A candidate with sensible defaults.
 *
 * @returns the candidate
 */
function candidate(title: string, changes: Partial<FeaturedCandidate>): FeaturedCandidate {
  return {
    id: title,
    slug: title.toLowerCase(),
    title,
    writerHandle: 'corbu',
    writerPenName: null,
    rank: 1,
    rankChange: 0,
    score: 1,
    readsThisWeek: 0,
    readThrough: 0,
    followers: 0,
    firstPublishedAt: null,
    rating: 'all_ages',
    categorySlug: 'fiction',
    isNewWriter: false,
    ineligibleReason: null,
    ...changes,
  };
}

const stories = [
  candidate('Third', { rank: 3, readsThisWeek: 90, rankChange: 4 }),
  candidate('First', { rank: 1, readsThisWeek: 10, rankChange: null }),
  candidate('Second', { rank: 2, readsThisWeek: 50, rankChange: -1 }),
];

describe('sortedCandidates', () => {
  it('sorts by rank, top first', () => {
    const sorted = sortedCandidates(stories, { key: 'rank', isAscending: true });
    expect(sorted.map((story) => story.title)).toEqual(['First', 'Second', 'Third']);
  });

  it('sorts by reads this week, most first, without changing any rank', () => {
    const sorted = sortedCandidates(stories, { key: 'readsThisWeek', isAscending: false });
    expect(sorted.map((story) => story.title)).toEqual(['Third', 'Second', 'First']);
    expect(sorted.map((story) => story.rank)).toEqual([3, 2, 1]);
  });

  it('puts a story with no rank a week ago last when sorting by the climb', () => {
    const sorted = sortedCandidates(stories, { key: 'rankChange', isAscending: false });
    expect(sorted.map((story) => story.title)).toEqual(['Third', 'Second', 'First']);
  });

  it('leaves the list it was given as it was', () => {
    sortedCandidates(stories, { key: 'readsThisWeek', isAscending: false });
    expect(stories.map((story) => story.title)).toEqual(['Third', 'First', 'Second']);
  });
});
