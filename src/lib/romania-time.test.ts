/**
 * Romania's calendar (story S1-E3-03; Q7): "today" reads the day the way Bucharest does, and
 * English dates are written the British way. Shown times and dates are tested in
 * local-time.test.ts (CALM-8b).
 */
import { describe, expect, it } from 'vitest';

import { romaniaNowFields, withShortSeptember } from './romania-time';

describe("Romania's calendar", () => {
  it('names today as Bucharest does, even when it is still yesterday in UTC', () => {
    // 23:30 UTC on 24 October is already 25 October in Bucharest.
    expect(romaniaNowFields(new Date('2026-10-24T23:30:00Z')).date).toBe('2026-10-25');
  });

  it('writes English dates the British way, with September as "Sep" (CTO, 24 Oct 2026)', () => {
    expect(withShortSeptember('5 Sept 2026')).toBe('5 Sep 2026');
    expect(withShortSeptember('5 sept. 2026')).toBe('5 sept. 2026');
  });
});
