/**
 * The day headings on the Notifications page (story S1-E7-01; board 6.2), counted on the viewer's
 * own clock (CALM-8b; Robert, 20 Nov 2026, 18:19 UTC). The tests pin the viewer to Bucharest and
 * check that a viewer in New York gets their own midnight.
 */
import { describe, expect, it } from 'vitest';

import { inTimeZone, pinViewerTimeZone } from '@/test/viewerTimeZone';

import { dayGroupOf } from './dayGroups';

/** Noon in Bucharest on 25 October 2026 (09:00 UTC, summer time ends that night). */
const now = new Date('2026-10-25T09:00:00Z');

describe('dayGroupOf', () => {
  pinViewerTimeZone('Europe/Bucharest');

  it('puts something from this morning under Today', () => {
    expect(dayGroupOf('2026-10-25T05:00:00Z', now)).toBe('today');
  });

  it('counts the viewer’s own day, so 22:30 UTC the night before is already today in Bucharest', () => {
    expect(dayGroupOf('2026-10-24T22:30:00Z', now)).toBe('today');
  });

  it('gives a viewer in New York their own midnight: the same moment is still yesterday there', () => {
    inTimeZone('America/New_York', () => {
      expect(dayGroupOf('2026-10-24T22:30:00Z', now)).toBe('yesterday');
    });
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
