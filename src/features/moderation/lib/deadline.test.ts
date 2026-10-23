/**
 * Unit tests for the deadline arithmetic (story S1-E10-03a).
 * Who runs it: `npm test`. Each test reads as a sentence about one deadline.
 */
import { describe, expect, it } from 'vitest';

import { deadlineScale, describeDeadline } from './deadline';

const now = new Date('2026-10-23T12:00:00Z');

describe('describeDeadline', () => {
  it('a same-day case with 5 hours 50 minutes to go reads in hours and minutes', () => {
    const parts = describeDeadline('2026-10-23T17:50:00Z', now);
    expect(parts).toEqual({ side: 'left', days: 0, hours: 5, minutes: 50 });
    expect(deadlineScale(parts)).toBe('hours');
  });

  it('a 7-day case with almost a week to go reads in days and hours', () => {
    const parts = describeDeadline('2026-10-30T11:30:00Z', now);
    expect(parts).toEqual({ side: 'left', days: 6, hours: 23, minutes: 30 });
    expect(deadlineScale(parts)).toBe('days');
  });

  it('a deadline that has passed is overdue by the same measure the other way', () => {
    const parts = describeDeadline('2026-10-23T09:45:00Z', now);
    expect(parts).toEqual({ side: 'overdue', days: 0, hours: 2, minutes: 15 });
  });

  it('a deadline right now has nothing left and is not overdue', () => {
    expect(describeDeadline('2026-10-23T12:00:00Z', now)).toEqual({
      side: 'left',
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });

  it('seconds are dropped, never rounded up', () => {
    expect(describeDeadline('2026-10-23T12:59:59Z', now).minutes).toBe(59);
  });
});
