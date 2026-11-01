/**
 * Tests for Night by the clock (IDEAS-1 part a; IDEA-20261031-7).
 */
import { describe, expect, it } from 'vitest';

import { defaultReadingSettings } from '../api/readingSettings';

import { chapterTheme, isInsideNightHours, minutesOf } from './nightByClock';

/** A moment today at a time of day on the device's clock. */
function at(hours: number, minutes = 0): Date {
  const moment = new Date(2026, 10, 1, hours, minutes);
  return moment;
}

describe('Night by the clock', () => {
  it('reads a time field into minutes and refuses anything else', () => {
    expect(minutesOf('22:30')).toBe(1350);
    expect(minutesOf('22:30:00')).toBe(1350);
    expect(minutesOf('25:00')).toBeNull();
    expect(minutesOf('')).toBeNull();
  });

  it('a span past midnight covers late evening and early morning, not the afternoon', () => {
    expect(isInsideNightHours(at(23, 15), '22:30', '06:00')).toBe(true);
    expect(isInsideNightHours(at(5, 59), '22:30', '06:00')).toBe(true);
    expect(isInsideNightHours(at(6, 0), '22:30', '06:00')).toBe(false);
    expect(isInsideNightHours(at(14, 0), '22:30', '06:00')).toBe(false);
  });

  it('a span inside one day works too, because the reader picks any hours', () => {
    expect(isInsideNightHours(at(13, 30), '13:00', '15:00')).toBe(true);
    expect(isInsideNightHours(at(15, 0), '13:00', '15:00')).toBe(false);
  });

  it('nothing changes until both times are set, or when they are the same', () => {
    expect(isInsideNightHours(at(23), null, '06:00')).toBe(false);
    expect(isInsideNightHours(at(23), '22:30', null)).toBe(false);
    expect(isInsideNightHours(at(23), '22:30', '22:30')).toBe(false);
  });

  it('a chapter opened inside the hours shows in Night, outside them in the usual theme', () => {
    const settings = {
      ...defaultReadingSettings,
      theme: 'sepia' as const,
      nightByClock: true,
      nightFrom: '22:30',
      nightUntil: '06:00',
    };
    expect(chapterTheme(settings, at(23), null)).toBe('night');
    expect(chapterTheme(settings, at(12), null)).toBe('sepia');
    expect(chapterTheme({ ...settings, nightByClock: false }, at(23), null)).toBe('sepia');
  });

  it('a theme picked by hand in the chapter wins over the clock', () => {
    const settings = {
      ...defaultReadingSettings,
      nightByClock: true,
      nightFrom: '22:30',
      nightUntil: '06:00',
    };
    expect(chapterTheme(settings, at(23), 'light')).toBe('light');
  });
});
