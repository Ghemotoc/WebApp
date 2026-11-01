/**
 * Tests for the minute counter's "actively reading" rule (bundle IDEAS-1, part b).
 */
import { describe, expect, it } from 'vitest';

import { activeForMilliseconds, isActivelyReading } from './activeReading';

describe('isActivelyReading', () => {
  it('counts a minute when the tab is on screen and the reader scrolled a moment ago', () => {
    expect(isActivelyReading(true, 1_000, 61_000)).toBe(true);
  });

  it("doesn't count a minute while the tab is hidden", () => {
    expect(isActivelyReading(false, 1_000, 61_000)).toBe(false);
  });

  it("doesn't count a chapter left open with nobody scrolling for over two minutes", () => {
    expect(isActivelyReading(true, 0, activeForMilliseconds + 1)).toBe(false);
  });
});
