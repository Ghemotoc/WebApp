/**
 * Tests for competitionDates (bundle CLASS-POINTS, part 2; CALM-7d, part 3): the moments a new
 * competition's form starts with, and how the fields turn into moments and back.
 */
import { describe, expect, it } from 'vitest';

import { defaultMomentFields, momentOf, savedMomentFields } from './competitionDates';

describe('competitionDates', () => {
  it('opens a new competition now and closes it at 23:59 two weeks later', () => {
    const now = new Date(2027, 0, 25, 9, 41);
    expect(defaultMomentFields(now)).toEqual({
      starts: { date: '2027-01-25', time: '09:41' },
      ends: { date: '2027-02-08', time: '23:59' },
    });
  });

  it('crosses a year end', () => {
    expect(defaultMomentFields(new Date(2026, 11, 20, 8, 0)).ends.date).toBe('2027-01-03');
  });

  it('gives no moment for a field that is not a real date and time', () => {
    expect(momentOf({ date: '', time: '09:00' })).toBeNull();
    expect(momentOf({ date: '2027-02-30', time: '09:00' })).toBeNull();
  });

  it('turns the fields into moments and back', () => {
    const startsAt = momentOf({ date: '2027-03-01', time: '08:00' });
    const endsAt = momentOf({ date: '2027-03-15', time: '23:59' });
    expect(startsAt).not.toBeNull();
    expect(savedMomentFields(startsAt ?? '', endsAt ?? '')).toEqual({
      starts: { date: '2027-03-01', time: '08:00' },
      ends: { date: '2027-03-15', time: '23:59' },
    });
  });
});
