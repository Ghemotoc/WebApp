/**
 * Tests for lib/hubDates.ts: the hub's day in the eyebrow and a contest's days left, both by the
 * Romanian calendar (bundle G9 WRITING, part a).
 */
import { describe, expect, it } from 'vitest';

import { daysUntilClose, formatHubDay } from './hubDates';

describe('daysUntilClose', () => {
  // 10 Nov 2026, 23:30 UTC is already 11 Nov in Bucharest (UTC+2).
  const lateEvening = new Date('2026-11-10T23:30:00Z');

  it('counts from today in Romania, not today in UTC', () => {
    expect(daysUntilClose('2026-11-12', lateEvening)).toBe(1);
  });

  it('says 0 on the last day of entries', () => {
    expect(daysUntilClose('2026-11-11', lateEvening)).toBe(0);
  });

  it('never counts below 0 for a day already past', () => {
    expect(daysUntilClose('2026-11-01', lateEvening)).toBe(0);
  });

  it('counts across the change to winter time without losing a day', () => {
    expect(daysUntilClose('2026-11-01', new Date('2026-10-20T10:00:00Z'))).toBe(12);
  });
});

describe('formatHubDay', () => {
  const friday = new Date('2026-11-06T10:00:00Z');

  it('writes the weekday, day and month in British English', () => {
    expect(formatHubDay(friday, 'en')).toBe('Friday 6 November');
  });

  it('writes them in Romanian for the Romanian interface', () => {
    expect(formatHubDay(friday, 'ro')).toBe('vineri, 6 noiembrie');
  });
});
