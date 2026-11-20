/**
 * The viewer's own local time (bundle CALM-8b; Robert, 20 Nov 2026, 17:49 UTC): the same moment
 * reads differently on each viewer's clock, either side of midnight and across a clock change;
 * and on 20 Nov 2026, 18:19 UTC, "All of them in local time": scheduled times are typed on it too.
 */
import { describe, expect, it } from 'vitest';

import { inTimeZone } from '@/test/viewerTimeZone';

import {
  defaultScheduleFields,
  formatCalendarDate,
  formatCalendarShortDate,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalDayAndTime,
  formatLocalShortDate,
  localFieldsFor,
  localTimeToInstant,
} from './local-time';

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

describe('formatLocalDateTime (CALM-8b; Robert, 20 Nov 2026, 18:19 UTC)', () => {
  const moment = new Date('2026-10-17T15:00:00Z');

  it('shows a moment on the viewer’s clock in both languages', () => {
    expect(formatLocalDateTime(moment, 'en', 'Europe/Bucharest')).toBe(
      'Saturday 17 October at 18:00',
    );
    expect(formatLocalDateTime(moment, 'ro', 'Europe/Bucharest')).toBe(
      'sâmbătă, 17 octombrie la 18:00',
    );
  });

  it('gives a viewer in Stockholm or New York their own hour, not Romania’s', () => {
    expect(formatLocalDateTime(moment, 'en', 'Europe/Stockholm')).toBe(
      'Saturday 17 October at 17:00',
    );
    expect(formatLocalDateTime(moment, 'en', 'America/New_York')).toBe(
      'Saturday 17 October at 11:00',
    );
  });
});

describe('localTimeToInstant: a scheduled time typed on the writer’s own clock', () => {
  it('reads 18:00 in Stockholm as 16:00 UTC in summer and 17:00 UTC in winter', () => {
    inTimeZone('Europe/Stockholm', () => {
      expect(localTimeToInstant('2026-10-17', '18:00')?.toISOString()).toBe(
        '2026-10-17T16:00:00.000Z',
      );
      expect(localTimeToInstant('2026-12-01', '18:00')?.toISOString()).toBe(
        '2026-12-01T17:00:00.000Z',
      );
    });
  });

  it('reads the same typed time differently in Bucharest and New York', () => {
    inTimeZone('Europe/Bucharest', () => {
      expect(localTimeToInstant('2026-10-17', '18:00')?.toISOString()).toBe(
        '2026-10-17T15:00:00.000Z',
      );
    });
    inTimeZone('America/New_York', () => {
      expect(localTimeToInstant('2026-10-17', '18:00')?.toISOString()).toBe(
        '2026-10-17T22:00:00.000Z',
      );
    });
  });

  it('on the night the clocks go back, the hour that happens twice is read as the first', () => {
    // Bucharest, 25 October 2026: 03:00 to 03:59 happens twice.
    inTimeZone('Europe/Bucharest', () => {
      expect(localTimeToInstant('2026-10-25', '03:30')?.toISOString()).toBe(
        '2026-10-25T00:30:00.000Z',
      );
    });
  });

  it('on the night the clocks go forward, a skipped time moves an hour on', () => {
    // Bucharest, 28 March 2027: 03:00 to 03:59 never happens.
    inTimeZone('Europe/Bucharest', () => {
      expect(localTimeToInstant('2027-03-28', '03:30')?.toISOString()).toBe(
        '2027-03-28T01:30:00.000Z',
      );
    });
  });

  it('refuses text that is not a real date and time (QA-5)', () => {
    expect(localTimeToInstant('', '18:00')).toBeNull();
    expect(localTimeToInstant('2026-10-17', '6pm')).toBeNull();
    expect(localTimeToInstant('2027-02-30', '10:00')).toBeNull();
    expect(localTimeToInstant('2027-02-29', '10:00')).toBeNull();
    expect(localTimeToInstant('2027-13-01', '10:00')).toBeNull();
    expect(localTimeToInstant('2026-11-05', '24:00')).toBeNull();
    expect(localTimeToInstant('2026-11-05', '18:60')).toBeNull();
  });
});

describe('the schedule fields start on the writer’s own clock', () => {
  it('starts at tomorrow, 18:00, by the writer’s own calendar', () => {
    // 23:30 UTC on 24 October: already the 25th in Bucharest, still the 24th in New York.
    const now = new Date('2026-10-24T23:30:00Z');
    inTimeZone('Europe/Bucharest', () => {
      expect(defaultScheduleFields(now)).toEqual({ date: '2026-10-26', time: '18:00' });
    });
    inTimeZone('America/New_York', () => {
      expect(defaultScheduleFields(now)).toEqual({ date: '2026-10-25', time: '18:00' });
    });
  });

  it('turns a moment back into the fields it was typed in', () => {
    inTimeZone('Europe/Stockholm', () => {
      expect(localFieldsFor(new Date('2026-10-17T16:05:00Z'))).toEqual({
        date: '2026-10-17',
        time: '18:05',
      });
    });
  });
});

describe('dates without a time follow the viewer too (Robert, 20 Nov 2026, 18:36 UTC)', () => {
  // 22:30 UTC on 8 Oct is 01:30 on 9 Oct in Bucharest but 18:30 on 8 Oct in New York.
  const lateEvening = new Date('2026-10-08T22:30:00Z');

  it('names the viewer’s own day for a timestamp', () => {
    expect(formatLocalShortDate(lateEvening, 'en', 'Europe/Bucharest')).toBe('9 Oct 2026');
    expect(formatLocalShortDate(lateEvening, 'ro', 'Europe/Bucharest')).toBe('9 oct. 2026');
    expect(formatLocalShortDate(lateEvening, 'en', 'America/New_York')).toBe('8 Oct 2026');
    expect(formatLocalDate(lateEvening, 'en', 'America/New_York')).toBe('8 October 2026');
    expect(formatLocalDate(lateEvening, 'ro', 'Europe/Bucharest')).toBe('9 octombrie 2026');
  });

  it('writes September as "Sep" in English (CTO, 24 Oct 2026)', () => {
    expect(formatLocalShortDate(new Date('2026-09-05T09:00:00Z'), 'en', 'UTC')).toBe('5 Sep 2026');
  });

  it('shows a stored calendar day as it is, with no zone shift, east or west', () => {
    for (const zone of ['Pacific/Honolulu', 'America/New_York', 'Europe/Bucharest', 'Pacific/Kiritimati']) {
      inTimeZone(zone, () => {
        expect(formatCalendarDate('2027-02-28', 'en')).toBe('28 February 2027');
        expect(formatCalendarShortDate('2027-02-28', 'ro')).toBe('28 feb. 2027');
      });
    }
  });
});
