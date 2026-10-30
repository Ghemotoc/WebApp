/**
 * Tests for the seasonal calendar helpers (stories S1-E11-11 and S1-E5-07).
 */
import { describe, expect, it } from 'vitest';

import { daysOfYear, localDateOf, occasionCovers, uncoveredDays } from './seasonalCalendar';

const halloween = { startsOn: '2027-10-25', endsOn: '2027-10-31', everyYear: true };
const winter = { startsOn: '2027-12-01', endsOn: '2028-02-29', everyYear: true };
const bookFair = { startsOn: '2026-11-18', endsOn: '2026-11-22', everyYear: false };

describe('occasionCovers', () => {
  it('a yearly occasion comes back every year on the same days', () => {
    expect(occasionCovers(halloween, '2026-10-30')).toBe(true);
    expect(occasionCovers(halloween, '2031-10-25')).toBe(true);
    expect(occasionCovers(halloween, '2026-11-01')).toBe(false);
  });

  it('a yearly range over New Year covers both ends and 29 February', () => {
    expect(occasionCovers(winter, '2026-12-24')).toBe(true);
    expect(occasionCovers(winter, '2027-01-15')).toBe(true);
    expect(occasionCovers(winter, '2028-02-29')).toBe(true);
    expect(occasionCovers(winter, '2027-03-01')).toBe(false);
  });

  it('a one-off occasion covers only its own year', () => {
    expect(occasionCovers(bookFair, '2026-11-20')).toBe(true);
    expect(occasionCovers(bookFair, '2027-11-20')).toBe(false);
  });
});

describe('uncoveredDays', () => {
  it('lists the days nothing covers, so staff see the gaps', () => {
    const gaps = uncoveredDays([halloween, winter], 2026);
    expect(gaps).toContain('2026-04-10');
    expect(gaps).not.toContain('2026-10-30');
    expect(gaps).not.toContain('2026-01-10');
    expect(gaps).toHaveLength(365 - 7 - 31 - 28 - 31);
  });
});

describe('daysOfYear and localDateOf', () => {
  it('a leap year has 366 days and a date reads in the device time zone', () => {
    expect(daysOfYear(2028)).toHaveLength(366);
    expect(localDateOf(new Date(2026, 9, 30, 23, 59))).toBe('2026-10-30');
  });
});
