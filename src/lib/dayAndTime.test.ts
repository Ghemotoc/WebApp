/**
 * Tests for dayAndTime (user stories bundle 10): the meta lines' "today, 09:12", "yesterday,
 * 18:40" and "14 October 2026".
 */
import { describe, expect, it } from 'vitest';

import { dayAndTime } from './dayAndTime';

/** A fixed "now" on the reader's own clock: 25 November 2026, 15:00. */
const now = new Date(2026, 10, 25, 15, 0);

/**
 * A moment on the reader's clock, as the database would send it.
 *
 * @returns the ISO text
 */
function at(day: number, hour: number, minute: number): string {
  return new Date(2026, 10, day, hour, minute).toISOString();
}

describe('dayAndTime', () => {
  it('writes a moment from today as "today" and the time', () => {
    expect(dayAndTime(at(25, 9, 12), 'en', now)).toBe('today, 09:12');
  });

  it('writes a moment from yesterday as "yesterday" and the time', () => {
    expect(dayAndTime(at(24, 18, 40), 'en', now)).toBe('yesterday, 18:40');
  });

  it('writes an older moment as a British date with no time', () => {
    expect(dayAndTime(at(14, 10, 0), 'en', now)).toBe('14 November 2026');
  });

  it('writes the Romanian words for today and yesterday', () => {
    expect(dayAndTime(at(25, 9, 12), 'ro', now)).toBe('azi, 09:12');
    expect(dayAndTime(at(24, 18, 40), 'ro', now)).toBe('ieri, 18:40');
  });
});
