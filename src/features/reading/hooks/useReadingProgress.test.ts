/**
 * The reading progress line's maths (story S1-E4-01a; board 3.5).
 */
import { describe, expect, it } from 'vitest';

import { progressThrough } from './useReadingProgress';

describe('progressThrough', () => {
  it('is 0 before the text reaches the bottom of the window', () => {
    expect(progressThrough(1000, 2000, 800)).toBe(0);
  });

  it('is the share of the text above the bottom of the window', () => {
    // The text starts 200 px down; 600 of its 2,000 px are above the window's bottom edge.
    expect(progressThrough(200, 2000, 800)).toBe(30);
  });

  it('is 100 once the last line is on screen, and never more', () => {
    expect(progressThrough(-1500, 2000, 800)).toBe(100);
  });

  it('is 0 for an empty text', () => {
    expect(progressThrough(0, 0, 800)).toBe(0);
  });
});
