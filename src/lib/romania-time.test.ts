/**
 * Romania's calendar (story S1-E3-03; Q7): dates read the day the way Bucharest does, and English
 * dates are written the British way. Times of day are tested in local-time.test.ts (CALM-8b).
 */
import { describe, expect, it } from 'vitest';

import { formatRomaniaShortDate, romaniaNowFields, withShortSeptember } from './romania-time';

describe("Romania's calendar", () => {
  it('names today as Bucharest does, even when it is still yesterday in UTC', () => {
    // 23:30 UTC on 24 October is already 25 October in Bucharest.
    expect(romaniaNowFields(new Date('2026-10-24T23:30:00Z')).date).toBe('2026-10-25');
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
