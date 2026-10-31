/**
 * Tests for lib/searchGroups.ts: search results grouped by type (story S1-E17-30).
 */
import { describe, expect, it } from 'vitest';

import type { SearchResult } from '../api/search';

import { groupSearchResults } from './searchGroups';

/** A result of a kind with a title. */
const result = (kind: SearchResult['kind'], title: string): SearchResult => ({
  kind,
  ref: title,
  chapter: null,
  title,
  snippet: title,
});

describe('groupSearchResults', () => {
  it('groups results by type in the order the types first appear', () => {
    const groups = groupSearchResults([
      result('character', 'Ana'),
      result('character', 'Bogdan'),
      result('entry', 'Farul'),
      result('idea', 'Cine?'),
    ]);
    expect(groups.map((group) => [group.kind, group.results.map((each) => each.title)])).toEqual([
      ['character', ['Ana', 'Bogdan']],
      ['entry', ['Farul']],
      ['idea', ['Cine?']],
    ]);
  });

  it('gives no groups for no results', () => {
    expect(groupSearchResults([])).toEqual([]);
  });
});
