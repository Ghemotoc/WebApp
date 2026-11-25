/**
 * Tests for recentSearches (user story 1.7): kept on this device, newest first, at most five.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  addRecentSearch,
  clearRecentSearches,
  readRecentSearches,
  RECENT_SEARCHES_KEY,
  removeRecentSearch,
} from './recentSearches';

afterEach(() => window.localStorage.clear());

describe('recent searches', () => {
  it('keeps the newest search first and only once, whatever its case', () => {
    addRecentSearch('salt mine');
    addRecentSearch('aurora.v');
    addRecentSearch('Salt Mine');

    expect(readRecentSearches()).toEqual(['Salt Mine', 'aurora.v']);
  });

  it('keeps five searches at most', () => {
    for (const term of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']) addRecentSearch(term);

    expect(readRecentSearches()).toEqual(['a6', 'a5', 'a4', 'a3', 'a2']);
  });

  it('removes one search, and Clear removes them all', () => {
    addRecentSearch('one');
    addRecentSearch('two');
    removeRecentSearch('one');
    expect(readRecentSearches()).toEqual(['two']);

    clearRecentSearches();
    expect(readRecentSearches()).toEqual([]);
  });

  it('ignores something in storage that is not a list of words', () => {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, '{"not":"a list"}');

    expect(readRecentSearches()).toEqual([]);
  });
});
