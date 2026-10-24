/**
 * Tests for the profile page's formatters (story S1-E5-05).
 */
import { describe, expect, it } from 'vitest';

import { formatJoinedMonth, formatStatNumber, initialsOf } from './formatting';

describe('formatJoinedMonth', () => {
  it('says the month and year someone joined, in English', () => {
    expect(formatJoinedMonth('2026-05-12T10:00:00Z', 'en')).toBe('May 2026');
  });

  it('says it in Romanian too', () => {
    expect(formatJoinedMonth('2026-05-12T10:00:00Z', 'ro')).toBe('mai 2026');
  });

  it('uses Romania’s calendar, so late on 31 May in London is already June', () => {
    expect(formatJoinedMonth('2026-05-31T22:30:00Z', 'en')).toBe('June 2026');
  });
});

describe('formatStatNumber', () => {
  it('shows small numbers exactly', () => {
    expect(formatStatNumber(1284, 'en')).toBe('1,284');
  });

  it('shortens large numbers', () => {
    expect(formatStatNumber(19_000, 'en')).toBe('19k');
  });
});

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Ana Maria Pop')).toBe('AM');
  });

  it('takes one letter of a single word, keeping Romanian letters', () => {
    expect(initialsOf('ștefan')).toBe('Ș');
  });
});
