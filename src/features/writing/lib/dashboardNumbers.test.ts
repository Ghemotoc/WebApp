/**
 * Tests for the dashboard's number formatting (story S1-E3-07).
 */
import { describe, expect, it } from 'vitest';

import { formatShownCount, formatShownPercent } from './dashboardNumbers';

describe('formatShownCount', () => {
  it('shows "fewer than 5" for a count that comes from fewer than 5 readers', () => {
    expect(formatShownCount(null, 'en', 'fewer than 5')).toBe('fewer than 5');
  });

  it('writes a large count the reader’s way', () => {
    expect(formatShownCount(1431, 'en', 'fewer than 5')).toBe('1,431');
    expect(formatShownCount(1431, 'ro', 'mai puțin de 5')).toBe('1.431');
  });

  it('shows zero as zero, which points to nobody', () => {
    expect(formatShownCount(0, 'en', 'fewer than 5')).toBe('0');
  });
});

describe('formatShownPercent', () => {
  it('writes a read-through rate as a percentage', () => {
    expect(formatShownPercent(61, 'en', 'fewer than 5')).toBe('61%');
  });

  it('shows "fewer than 5" when fewer than 5 readers kept a place', () => {
    expect(formatShownPercent(null, 'en', 'fewer than 5')).toBe('fewer than 5');
  });
});
