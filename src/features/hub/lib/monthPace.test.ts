/**
 * Tests for the Home page's writing-month numbers (bundle CALM-7c).
 */
import { describe, expect, it } from 'vitest';

import { daysLeftInMonth, wordsPerDayToGoal, writingMonthDay } from './monthPace';

describe('writing month numbers', () => {
  it('reads the day on the Bucharest calendar, not the UTC one', () => {
    // 22:30 UTC on 6 November is already 7 November in Bucharest (UTC+2).
    expect(writingMonthDay(new Date('2026-11-06T22:30:00Z'))).toBe(7);
  });

  it('counts the days left with today included', () => {
    expect(daysLeftInMonth(new Date('2026-11-07T10:00:00Z'))).toBe(24);
    expect(daysLeftInMonth(new Date('2026-11-30T10:00:00Z'))).toBe(1);
  });

  it('spreads the words left over the days left, rounded up', () => {
    // 15,000 - 6,240 = 8,760 words over 24 days is 365 a day.
    expect(wordsPerDayToGoal(6240, 15000, new Date('2026-11-07T10:00:00Z'))).toBe(365);
  });

  it('asks for nothing once the goal is reached', () => {
    expect(wordsPerDayToGoal(16000, 15000, new Date('2026-11-07T10:00:00Z'))).toBe(0);
  });
});
