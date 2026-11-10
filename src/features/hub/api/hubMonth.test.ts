/**
 * Tests for api/hubMonth.ts: the share of the month's goal the bar shows (bundle GAPS-12f).
 */
import { describe, expect, it } from 'vitest';

import { monthPercent } from './hubMonth';

describe('monthPercent', () => {
  it('rounds down, so 42.9% reads as 42%', () => {
    expect(monthPercent(6435, 15000)).toBe(42);
  });

  it('starts at 0 and never goes past 100', () => {
    expect(monthPercent(0, 15000)).toBe(0);
    expect(monthPercent(15000, 15000)).toBe(100);
    expect(monthPercent(90000, 15000)).toBe(100);
  });

  it('shows 0 when there is no goal to measure against', () => {
    expect(monthPercent(500, 0)).toBe(0);
  });
});
