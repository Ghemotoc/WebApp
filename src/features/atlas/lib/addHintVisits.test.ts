/**
 * Tests for addHintVisits.ts: the top bar's add buttons keep their words for three visits
 * (user stories bundle 6, story 6.2).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { countAtlasVisit, showsAddHints } from './addHintVisits';

describe('addHintVisits', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('counts one visit per browser session, however many Atlas pages open', () => {
    expect(countAtlasVisit()).toBe(1);
    expect(countAtlasVisit()).toBe(1);
  });

  it('counts a new session as a new visit', () => {
    countAtlasVisit();
    window.sessionStorage.clear();
    expect(countAtlasVisit()).toBe(2);
  });

  it('shows the words for the first three visits, then folds them away', () => {
    expect(showsAddHints(1)).toBe(true);
    expect(showsAddHints(3)).toBe(true);
    expect(showsAddHints(4)).toBe(false);
  });

  it('keeps the words when the browser keeps no storage', () => {
    expect(showsAddHints(0)).toBe(true);
  });
});
