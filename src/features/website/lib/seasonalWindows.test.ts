/**
 * Tests for the seasonal window sums (bundle G12a).
 */
import { describe, expect, it } from 'vitest';

import { decidedSeasonalWindows } from '@/lib/looks';

import {
  daysInMonth,
  formatMonthDay,
  monthDayFrom,
  partsOf,
  windowsOverlap,
} from './seasonalWindows';

describe('seasonal windows', () => {
  it('splits and joins a month-day', () => {
    expect(partsOf('01-08')).toEqual({ month: 1, day: 8 });
    expect(monthDayFrom({ month: 12, day: 1 })).toBe('12-01');
  });

  it('lets February end on the 29th', () => {
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(12)).toBe(31);
  });

  it('finds no overlap in the decided windows', () => {
    expect(windowsOverlap(decidedSeasonalWindows)).toBe(false);
  });

  it('finds no overlap when winter crosses the new year without touching autumn', () => {
    const windows = decidedSeasonalWindows.map((window) =>
      window.look === 'winter' ? { ...window, from: '12-01' } : window,
    );
    expect(windowsOverlap(windows)).toBe(false);
  });

  it('finds the overlap when winter starts inside autumn', () => {
    const windows = decidedSeasonalWindows.map((window) =>
      window.look === 'winter' ? { ...window, from: '11-15' } : window,
    );
    expect(windowsOverlap(windows)).toBe(true);
  });

  it('writes a day in the reader language', () => {
    expect(formatMonthDay('01-08', 'en')).toBe('8 Jan');
    expect(formatMonthDay('09-01', 'en')).toBe('1 Sep');
  });
});
