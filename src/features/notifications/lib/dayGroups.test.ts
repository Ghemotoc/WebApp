/**
 * The day headings on the Notifications page (story S1-E7-01; board 6.2), counted in Romanian
 * time.
 */
import { describe, expect, it } from 'vitest';

import { dayGroupOf } from './dayGroups';

/** Noon in Bucharest on 25 October 2026 (09:00 UTC, summer time ends that night). */
const now = new Date('2026-10-25T09:00:00Z');

describe('dayGroupOf', () => {
  it('puts something from this morning under Today', () => {
    expect(dayGroupOf('2026-10-25T05:00:00Z', now)).toBe('today');
  });

  it('counts the day in Romania, so 23:30 UTC the night before is already today there', () => {
    expect(dayGroupOf('2026-10-24T22:30:00Z', now)).toBe('today');
  });

  it('puts yesterday under Yesterday', () => {
    expect(dayGroupOf('2026-10-24T12:00:00Z', now)).toBe('yesterday');
  });

  it('puts two to six days ago under Earlier this week', () => {
    expect(dayGroupOf('2026-10-20T12:00:00Z', now)).toBe('thisWeek');
  });

  it('puts a week ago or more under Older', () => {
    expect(dayGroupOf('2026-10-18T12:00:00Z', now)).toBe('older');
  });
});
