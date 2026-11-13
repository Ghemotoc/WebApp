/**
 * Tests for the dates on the class points screens (bundle CLASS-POINTS, part 1; story S1-E8-13).
 */
import { describe, expect, it } from 'vitest';

import { dayText, lastDayBefore } from './classPointsDates';

describe('dayText', () => {
  it('writes a day with its weekday in English and in Romanian', () => {
    expect(dayText('2027-03-08', 'en')).toBe('Monday 8 March');
    expect(dayText('2027-03-08', 'ro')).toBe('luni, 8 martie');
  });

  it('gives back what it was sent when that isn’t a day', () => {
    expect(dayText('soon', 'en')).toBe('soon');
  });
});

describe('lastDayBefore', () => {
  it('is the Sunday before the Monday a new budget starts, across a month’s end', () => {
    expect(lastDayBefore('2027-03-08')).toBe('2027-03-07');
    expect(lastDayBefore('2027-03-01')).toBe('2027-02-28');
  });

  it('gives back what it was sent when that isn’t a day', () => {
    expect(lastDayBefore('soon')).toBe('soon');
  });
});
