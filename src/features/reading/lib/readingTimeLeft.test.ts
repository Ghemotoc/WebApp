/**
 * Tests for lib/readingTimeLeft.ts: the floating "3 min left" in the reader (bundle G7d).
 */
import { describe, expect, it } from 'vitest';

import { minutesLeft } from './readingTimeLeft';

describe('the reading time left', () => {
  it('shows the whole chapter before the reader starts', () => {
    expect(minutesLeft(6, 0)).toBe(6);
  });

  it('counts down as the reader scrolls, rounding up', () => {
    expect(minutesLeft(6, 50)).toBe(3);
    expect(minutesLeft(6, 60)).toBe(3);
  });

  it('never says 0 while there is still text to scroll', () => {
    expect(minutesLeft(1, 99)).toBe(1);
  });

  it('goes away once the last line is on screen', () => {
    expect(minutesLeft(6, 100)).toBeNull();
  });
});
