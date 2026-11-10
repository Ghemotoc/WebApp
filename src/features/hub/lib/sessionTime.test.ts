/**
 * Tests for the times a live session shows (bundle GAPS-12h).
 */
import { describe, expect, it } from 'vitest';

import { fromDateTimeField, sessionStartParts, toDateTimeField } from './sessionTime';

describe('sessionStartParts', () => {
  it('writes the date tile and the weekday with a 24-hour time, in English', () => {
    expect(sessionStartParts('2026-11-13T16:00:00Z', 'en', 'Europe/Bucharest')).toEqual({
      month: 'Nov',
      day: '13',
      weekdayAndTime: 'Friday 18:00',
    });
  });

  it('writes the same moment in Romanian, with a capital on the weekday', () => {
    const parts = sessionStartParts('2026-11-13T16:00:00Z', 'ro', 'Europe/Bucharest');
    expect(parts.weekdayAndTime).toBe('Vineri 18:00');
    expect(parts.day).toBe('13');
    expect(parts.month.endsWith('.')).toBe(false);
  });

  it('shows another country its own hour and, past midnight, its own day', () => {
    const parts = sessionStartParts('2026-11-13T22:30:00Z', 'en', 'Pacific/Auckland');
    expect(parts.day).toBe('14');
    expect(parts.weekdayAndTime).toBe('Saturday 11:30');
  });
});

describe('the staff form’s date and time field', () => {
  it('gives back the moment it was given', () => {
    const field = toDateTimeField('2026-11-13T16:00:00.000Z');
    expect(field).toMatch(/^2026-11-1[34]T\d{2}:\d{2}$/);
    expect(fromDateTimeField(field)).toBe('2026-11-13T16:00:00.000Z');
  });

  it('keeps an empty or broken value empty instead of inventing a date', () => {
    expect(toDateTimeField('')).toBe('');
    expect(toDateTimeField('not a date')).toBe('');
    expect(fromDateTimeField('')).toBe('');
    expect(fromDateTimeField('13 Nov')).toBe('');
  });
});
