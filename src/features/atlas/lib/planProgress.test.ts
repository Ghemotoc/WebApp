/**
 * Tests for the words-against-target bar (story S1-E17-06).
 */
import { describe, expect, it } from 'vitest';

import { percentOfTarget } from './planProgress';

describe('words written against the target (S1-E17-06)', () => {
  it('rounds down, so 100% means the target is reached', () => {
    expect(percentOfTarget(44999, 90000)).toBe(49);
    expect(percentOfTarget(89999, 90000)).toBe(99);
    expect(percentOfTarget(90000, 90000)).toBe(100);
  });

  it('stays at 100 past the target', () => {
    expect(percentOfTarget(120000, 90000)).toBe(100);
  });

  it('is 0 for a story with no words yet', () => {
    expect(percentOfTarget(0, 90000)).toBe(0);
  });
});
