/**
 * Tests for reading the ranking place (story S1-E15-05, criteria 2 and 3).
 */
import { describe, expect, it } from 'vitest';

import { rankingPlaceFromAnswer } from './rankingPlace';

describe('rankingPlaceFromAnswer', () => {
  it('reads the place and the category', () => {
    expect(rankingPlaceFromAnswer({ place: 3, category_slug: 'fantasy' })).toEqual({
      place: 3,
      categorySlug: 'fantasy',
    });
  });

  it('gives nothing when the database has no place to show', () => {
    expect(rankingPlaceFromAnswer(null)).toBeNull();
    expect(rankingPlaceFromAnswer({ place: '3' })).toBeNull();
  });
});
