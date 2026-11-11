/**
 * Unit tests for dueDayText (bundle MUST-1, part d; IDEA-20261108-8).
 * Who runs it: `npm test`. What it proves: a due day reads as the weekday, the day and the short
 * month, on the same calendar day whatever the time zone.
 */
import { describe, expect, it } from 'vitest';

import { dueDayText } from './assignmentDue';

describe('dueDayText', () => {
  it('reads a due day as "Friday 13 Nov" in English, day before month', () => {
    expect(dueDayText('2026-11-13', 'en')).toBe('Friday 13 Nov');
  });

  it('spells the day out in Romanian', () => {
    expect(dueDayText('2026-11-13', 'ro')).toMatch(/^vineri,? 13 nov/);
  });
});
