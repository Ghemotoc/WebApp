/**
 * Tests for the investor spreadsheets and the month-on-month change (story S1-E15-04, criterion 5).
 */
import { describe, expect, it } from 'vitest';

import type { InvestorMonth } from '../api/investorNumbers';

import { investorDaysCsv, investorMonthsCsv, monthChange } from './investorCsv';

/** A month with every number at zero, changed where a test needs it. */
function month(overrides: Partial<InvestorMonth>): InvestorMonth {
  return {
    month: '2026-11',
    signUps: 0,
    averageDailyActive: null,
    monthlyActive: null,
    storiesRead: 0,
    chapterReads: 0,
    chaptersFinished: 0,
    finishRate: null,
    minutesInApp: 0,
    minutesReading: 0,
    writersPublishing: 0,
    retentionDay1: null,
    retentionDay7: null,
    retentionDay30: null,
    ...overrides,
  };
}

describe('monthChange', () => {
  it('gives the change from last month in whole per cent', () => {
    expect(monthChange(150, 100)).toBe(50);
    expect(monthChange(90, 120)).toBe(-25);
  });

  it('gives nothing when a month is missing or last month was zero', () => {
    expect(monthChange(10, 0)).toBeNull();
    expect(monthChange(null, 10)).toBeNull();
  });
});

describe('investorMonthsCsv', () => {
  it('writes one row per month, with an empty cell for a number not counted', () => {
    const csv = investorMonthsCsv(
      [month({ month: '2026-10', signUps: 4 }), month({ signUps: 9, finishRate: 41.5 })],
      [
        { key: 'signUps', label: 'Sign-ups' },
        { key: 'finishRate', label: 'Finish rate, %' },
      ],
      'Month',
    );
    expect(csv).toBe('Month,Sign-ups,"Finish rate, %"\r\n2026-10,4,\r\n2026-11,9,41.5');
  });
});

describe('investorDaysCsv', () => {
  it('turns the stored numbers into one row per day, oldest first', () => {
    const csv = investorDaysCsv(
      [
        { day: '2026-11-02', metric: 'sign_ups', value: 3 },
        { day: '2026-11-01', metric: 'active_members', value: 12 },
        { day: '2026-11-01', metric: 'sign_ups', value: 1 },
      ],
      [
        { key: 'active_members', label: 'Active members' },
        { key: 'sign_ups', label: 'Sign-ups' },
      ],
      'Day',
    );
    expect(csv).toBe('Day,Active members,Sign-ups\r\n2026-11-01,12,1\r\n2026-11-02,,3');
  });
});
