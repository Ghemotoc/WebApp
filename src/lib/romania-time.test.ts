/**
 * Romania time (story S1-E3-03; Q7): the conversion holds in summer, in winter and on the two
 * nights the clocks change.
 */
import { describe, expect, it } from 'vitest';

import {
  defaultScheduleFields,
  formatRomaniaDateTime,
  formatRomaniaDayAndTime,
  formatRomaniaShortDate,
  withShortSeptember,
  romaniaTimeToInstant,
} from './romania-time';

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

  it('refuses a day the month does not have and a time past 23:59 (QA-5)', () => {
    expect(romaniaTimeToInstant('2027-02-30', '10:00')).toBeNull();
    expect(romaniaTimeToInstant('2027-02-29', '10:00')).toBeNull();
    expect(romaniaTimeToInstant('2027-13-01', '10:00')).toBeNull();
    expect(romaniaTimeToInstant('2026-11-05', '24:00')).toBeNull();
    expect(romaniaTimeToInstant('2026-11-05', '18:60')).toBeNull();
    expect(romaniaTimeToInstant('2028-02-29', '10:00')?.toISOString()).toBe(
      '2028-02-29T08:00:00.000Z',
    );
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
    expect(formatRomaniaDateTime(moment, 'en')).toBe('Saturday 17 October at 18:00');
    expect(formatRomaniaDateTime(moment, 'ro')).toBe('sâmbătă, 17 octombrie la 18:00');
  });

  it('shows the short date in Romania, even when it is already the next day there', () => {
    // 22:30 UTC on 8 Oct is 01:30 on 9 Oct in Bucharest (summer time).
    const moment = new Date('2026-10-08T22:30:00Z');
    expect(formatRomaniaShortDate(moment, 'en')).toBe('9 Oct 2026');
    expect(formatRomaniaShortDate(moment, 'ro')).toBe('9 oct. 2026');
  });

  it('writes English dates the British way, with September as "Sep" (CTO, 24 Oct 2026)', () => {
    expect(formatRomaniaShortDate(new Date('2026-09-05T09:00:00Z'), 'en')).toBe('5 Sep 2026');
    expect(withShortSeptember('5 Sept 2026')).toBe('5 Sep 2026');
    expect(withShortSeptember('5 sept. 2026')).toBe('5 sept. 2026');
  });
});

describe('formatRomaniaDayAndTime (CALM-8)', () => {
  it('writes when a pause ends with the weekday, the date and the time after a comma', () => {
    // 16:40 UTC on 22 November is 18:40 in Bucharest (winter time, UTC+2).
    const moment = new Date('2026-11-22T16:40:00Z');
    expect(formatRomaniaDayAndTime(moment, 'en')).toBe('Sunday 22 November, 18:40');
    expect(formatRomaniaDayAndTime(moment, 'ro')).toBe('duminică, 22 noiembrie, 18:40');
  });

  it('reads the Bucharest clock in summer time too', () => {
    // 15:05 UTC on 1 July is 18:05 in Bucharest (summer time, UTC+3).
    expect(formatRomaniaDayAndTime(new Date('2027-07-01T15:05:00Z'), 'en')).toBe(
      'Thursday 1 July, 18:05',
    );
  });

  it('names the Romanian day, not the UTC one, just before and after midnight UTC', () => {
    // 21:59 UTC on Saturday is 23:59 the same evening in Bucharest.
    expect(formatRomaniaDayAndTime(new Date('2026-11-21T21:59:00Z'), 'en')).toBe(
      'Saturday 21 November, 23:59',
    );
    // 22:30 UTC on Saturday is already 00:30 on Sunday in Bucharest.
    expect(formatRomaniaDayAndTime(new Date('2026-11-21T22:30:00Z'), 'en')).toBe(
      'Sunday 22 November, 00:30',
    );
    expect(formatRomaniaDayAndTime(new Date('2026-11-21T22:30:00Z'), 'ro')).toBe(
      'duminică, 22 noiembrie, 00:30',
    );
    // 00:30 UTC on Sunday is 02:30 on Sunday: the UTC and Bucharest days agree again.
    expect(formatRomaniaDayAndTime(new Date('2026-11-22T00:30:00Z'), 'en')).toBe(
      'Sunday 22 November, 02:30',
    );
  });

  it('jumps over the hour the clocks skip when summer time starts', () => {
    // At 01:00 UTC on 28 March 2027 Bucharest goes from 02:59 straight to 04:00.
    expect(formatRomaniaDayAndTime(new Date('2027-03-28T00:59:00Z'), 'en')).toBe(
      'Sunday 28 March, 02:59',
    );
    expect(formatRomaniaDayAndTime(new Date('2027-03-28T01:00:00Z'), 'en')).toBe(
      'Sunday 28 March, 04:00',
    );
  });
});
