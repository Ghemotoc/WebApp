/**
 * Tests for the search results' filters (user story 1.8, board A08-SearchResults): how many are
 * on, and that Rating and Length travel in the address like the others.
 */
import { describe, expect, it } from 'vitest';

import { plainList } from '@/features/discovery/lib/listAddresses';

import { filtersOn, paramsFor } from './searchFilters';

describe('filtersOn', () => {
  it('counts no filter on a plain search', () => {
    expect(filtersOn(plainList('search', 'sare'))).toBe(0);
  });

  it('counts Status, Language, Rating and Length, but not the sort', () => {
    const request = {
      ...plainList('search', 'sare'),
      completion: 'ongoing' as const,
      languageCode: 'ro',
      storyRating: '13_plus' as const,
      storyLength: 'short' as const,
      sortOrder: 'popular' as const,
    };
    expect(filtersOn(request)).toBe(4);
  });
});

describe('paramsFor', () => {
  it('puts Rating and Length in the address and keeps the tab', () => {
    const request = {
      ...plainList('search', 'sare'),
      storyRating: '18_plus' as const,
      storyLength: 'long' as const,
    };
    const params = paramsFor(request, 'writers');
    expect(params.get('rating')).toBe('18_plus');
    expect(params.get('length')).toBe('long');
    expect(params.get('in')).toBe('writers');
  });
});
