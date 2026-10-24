/**
 * Romania time (story S1-E3-03; Q7): the conversion holds in summer, in winter and on the two
 * nights the clocks change.
 */
import { describe, expect, it } from 'vitest';

import { defaultScheduleFields, formatRomaniaDateTime, romaniaTimeToInstant } from './romania-time';

describe('romaniaTimeToInstant', () => {
  it('reads summer time as UTC+3', () => {
    expect(romaniaTimeToInstant('2026-10-17', '18:00')?.toISOString()).toBe(
      '2026-10-17T15:00:00.000Z',
    );
  });

  it('reads winter time as UTC+2', () => {
    expect(romaniaTimeToInstant('2026-12-01', '18:00')?.toISOString()).toBe(
      '2026-12-01T16:00:00.000Z',
    );
  });

  it('on the night the clocks go back (25 October 2026), 03:30 happens twice: the first is used', () => {
    expect(romaniaTimeToInstant('2026-10-25', '03:30')?.toISOString()).toBe(
      '2026-10-25T00:30:00.000Z',
    );
    expect(romaniaTimeToInstant('2026-10-25', '04:30')?.toISOString()).toBe(
      '2026-10-25T02:30:00.000Z',
    );
  });

  it('on the night the clocks go forward (28 March 2027), the missing 03:30 moves an hour on', () => {
    expect(romaniaTimeToInstant('2027-03-28', '02:30')?.toISOString()).toBe(
      '2027-03-28T00:30:00.000Z',
    );
    expect(romaniaTimeToInstant('2027-03-28', '03:30')?.toISOString()).toBe(
      '2027-03-28T01:30:00.000Z',
    );
  });

  it('refuses text that is not a date and a time', () => {
    expect(romaniaTimeToInstant('', '18:00')).toBeNull();
    expect(romaniaTimeToInstant('2026-10-17', '6pm')).toBeNull();
  });
});

describe('the fields and the label', () => {
  it('starts the fields at tomorrow, 18:00 Romania time', () => {
    // 23:30 UTC on 24 October is already 25 October in Bucharest, so tomorrow is the 26th.
    expect(defaultScheduleFields(new Date('2026-10-24T23:30:00Z'))).toEqual({
      date: '2026-10-26',
      time: '18:00',
    });
  });

  it('shows a moment as Romania time in both languages', () => {
    const moment = new Date('2026-10-17T15:00:00Z');
    expect(formatRomaniaDateTime(moment, 'en')).toBe('Saturday, October 17 at 18:00');
    expect(formatRomaniaDateTime(moment, 'ro')).toBe('sâmbătă, 17 octombrie la 18:00');
  });
});
