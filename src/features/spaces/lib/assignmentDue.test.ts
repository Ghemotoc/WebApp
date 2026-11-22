/**
 * Unit tests for the due moment helpers (bundle MUST-1, part d, IDEA-20261108-8; CALM-7d,
 * part 2).
 * Who runs it: `npm test`. What it proves: a due moment reads as the weekday, the day, the short
 * month and the time on the reader's clock, and the teacher's field turns into a moment and back.
 */
import { describe, expect, it } from 'vitest';

import { dueAtOf, dueFieldsOf, dueMomentText } from './assignmentDue';

describe('dueMomentText', () => {
  it('reads a due moment as "Friday 13 Nov, 08:00" in English, day before month', () => {
    expect(dueMomentText('2026-11-13T06:00:00Z', 'en', 'Europe/Bucharest')).toBe(
      'Friday 13 Nov, 08:00',
    );
  });

  it('spells the day out in Romanian', () => {
    expect(dueMomentText('2026-11-13T06:00:00Z', 'ro', 'Europe/Bucharest')).toMatch(
      /^vineri,? 13 nov\.?,? 08:00$/,
    );
  });

  it('follows the reader’s own time zone', () => {
    expect(dueMomentText('2026-11-13T06:00:00Z', 'en', 'Europe/London')).toBe(
      'Friday 13 Nov, 06:00',
    );
  });
});

describe('dueFieldsOf and dueAtOf', () => {
  it('starts an empty field with no date and the end of the day', () => {
    expect(dueFieldsOf(null)).toEqual({ date: '', time: '23:59' });
  });

  it('gives no moment while the date is empty', () => {
    expect(dueAtOf({ date: '', time: '23:59' })).toBeNull();
  });

  it('turns the field into a moment and back', () => {
    const dueAt = dueAtOf({ date: '2027-03-12', time: '08:30' });
    expect(dueAt).not.toBeNull();
    expect(dueFieldsOf(dueAt)).toEqual({ date: '2027-03-12', time: '08:30' });
  });
});
