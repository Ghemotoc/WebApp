/**
 * Unit tests for the Metrics page's extra numbers (story S1-E11-04): reading the answer and the
 * "handled in time" share. Who runs it: `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { metricsOverviewFromAnswer } from '../api/metricsOverview';

import { shareInTime, tierTotals } from './tierShares';

describe('the metrics overview', () => {
  it('reads the age groups, the age checks and the tiers it knows', () => {
    const overview = metricsOverviewFromAnswer({
      sign_ups_by_age: { '13_to_15': 58, '16_to_17': 71, '18_plus': 47, not_given: 0, total: 176 },
      age_checks: { passed: 162, failed: 9, not_finished: 5, appealed: null },
      cases_by_tier: [
        { tier: 'same_day', hours: 24, cases: 2, measured: 2, in_time: 2 },
        { tier: 'made_up', hours: 1, cases: 9, measured: 9, in_time: 9 },
      ],
      tier_window_days: 30,
    });
    expect(overview.signUpsByAge.sixteenToSeventeen).toBe(71);
    expect(overview.ageChecks.appealed).toBeNull();
    expect(overview.casesByTier).toEqual([
      { tier: 'same_day', hours: 24, cases: 2, measured: 2, inTime: 2 },
    ]);
  });

  it('counts nothing rather than failing when the answer is empty', () => {
    const overview = metricsOverviewFromAnswer(null);
    expect(overview.signUpsByAge.total).toBe(0);
    expect(overview.casesByTier).toEqual([]);
    expect(overview.tierWindowDays).toBe(30);
  });
});

describe('the handled-in-time share', () => {
  it('is a whole per cent, and nothing when no case can be measured yet', () => {
    expect(shareInTime(4, 5)).toBe(80);
    expect(shareInTime(45, 48)).toBe(94);
    expect(shareInTime(0, 0)).toBeNull();
  });

  it('adds every tier together', () => {
    expect(
      tierTotals([
        { tier: 'two_days', hours: 48, cases: 5, measured: 5, inTime: 4 },
        { tier: 'seven_days', hours: 168, cases: 43, measured: 41, inTime: 39 },
      ]),
    ).toEqual({ measured: 46, inTime: 43 });
  });
});
