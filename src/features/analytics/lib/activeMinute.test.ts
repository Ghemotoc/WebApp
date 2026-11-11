/**
 * Tests for the investor numbers' minute rule (story S1-E15-04, criterion 1).
 */
import { describe, expect, it } from 'vitest';

import { isChapterPath, minuteCounts } from './activeMinute';

describe('minuteCounts', () => {
  it('counts a minute while the tab is visible and the person was there lately', () => {
    expect(minuteCounts(true, 1_000, 61_000)).toBe(true);
  });

  it('doesn’t count a hidden tab or an app left alone for more than two minutes', () => {
    expect(minuteCounts(false, 1_000, 61_000)).toBe(false);
    expect(minuteCounts(true, 0, 3 * 60 * 1000)).toBe(false);
  });
});

describe('isChapterPath', () => {
  it('knows a chapter, with or without a shared passage', () => {
    expect(isChapterPath('/s/tide-tables/ab12cd34')).toBe(true);
    expect(isChapterPath('/s/tide-tables/ab12cd34/p3')).toBe(true);
  });

  it('doesn’t take the story page or another page for reading', () => {
    expect(isChapterPath('/s/tide-tables')).toBe(false);
    expect(isChapterPath('/discover')).toBe(false);
    expect(isChapterPath('/write/s/tide-tables/c/ab12cd34')).toBe(false);
  });
});
