/**
 * The viewer's own local time (bundle CALM-8b; Robert, 20 Nov 2026, 17:49 UTC): the same moment
 * reads differently on each viewer's clock, either side of midnight and across a clock change.
 */
import { describe, expect, it } from 'vitest';

import { formatLocalDayAndTime } from './local-time';

describe('formatLocalDayAndTime (CALM-8b)', () => {
  // 16:40 UTC on Sunday 22 November 2026.
  const moment = new Date('2026-11-22T16:40:00Z');

  it('writes the weekday, the date and the time after a comma, in both languages', () => {
    expect(formatLocalDayAndTime(moment, 'en', 'Europe/Bucharest')).toBe(
      'Sunday 22 November, 18:40',
    );
    expect(formatLocalDayAndTime(moment, 'ro', 'Europe/Bucharest')).toBe(
      'duminică, 22 noiembrie, 18:40',
    );
  });

  it('follows the viewer: Stockholm, New York and Hawaii each see their own clock', () => {
    expect(formatLocalDayAndTime(moment, 'en', 'Europe/Stockholm')).toBe(
      'Sunday 22 November, 17:40',
    );
    expect(formatLocalDayAndTime(moment, 'en', 'America/New_York')).toBe(
      'Sunday 22 November, 11:40',
    );
    // UTC-10: still the morning of the same day.
    expect(formatLocalDayAndTime(moment, 'en', 'Pacific/Honolulu')).toBe(
      'Sunday 22 November, 06:40',
    );
  });

  it('names the viewer’s own day either side of midnight', () => {
    // 23:30 UTC on Saturday is already Sunday in Bucharest but still Saturday in New York.
    const lateSaturday = new Date('2026-11-21T23:30:00Z');
    expect(formatLocalDayAndTime(lateSaturday, 'en', 'Europe/Bucharest')).toBe(
      'Sunday 22 November, 01:30',
    );
    expect(formatLocalDayAndTime(lateSaturday, 'en', 'America/New_York')).toBe(
      'Saturday 21 November, 18:30',
    );
    expect(formatLocalDayAndTime(lateSaturday, 'ro', 'Pacific/Honolulu')).toBe(
      'sâmbătă, 21 noiembrie, 13:30',
    );
  });

  it('jumps over the hour the clocks skip when summer time starts', () => {
    // At 01:00 UTC on 28 March 2027 Stockholm goes from 01:59 straight to 03:00.
    expect(formatLocalDayAndTime(new Date('2027-03-28T00:59:00Z'), 'en', 'Europe/Stockholm')).toBe(
      'Sunday 28 March, 01:59',
    );
    expect(formatLocalDayAndTime(new Date('2027-03-28T01:00:00Z'), 'en', 'Europe/Stockholm')).toBe(
      'Sunday 28 March, 03:00',
    );
  });

  it('uses the browser’s own zone when none is given', () => {
    const expected = formatLocalDayAndTime(
      moment,
      'en',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(formatLocalDayAndTime(moment, 'en')).toBe(expected);
  });
});
