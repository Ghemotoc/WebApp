/**
 * Unit tests for the staff Metrics page's helpers and answer reader (story S1-E15-02).
 */
import { describe, expect, it } from 'vitest';

import { marchNumbersFromAnswer } from '../api/marchNumbers';

import { marketName, progressTowards } from './marchNumbers';

describe('progressTowards', () => {
  it('gives the share of the target, rounded', () => {
    expect(progressTowards(14, 20)).toBe(70);
  });

  it('never goes past 100 when the target is beaten', () => {
    expect(progressTowards(250, 200)).toBe(100);
  });

  it('is 0 before anything is counted or when the target is 0', () => {
    expect(progressTowards(null, 20)).toBe(0);
    expect(progressTowards(5, 0)).toBe(0);
  });
});

describe('marketName', () => {
  it('names a country in the interface language', () => {
    expect(marketName('RO', 'en', 'Other countries')).toBe('Romania');
    expect(marketName('RO', 'ro', 'Alte țări')).toBe('România');
  });

  it('uses the words for other countries for "other"', () => {
    expect(marketName('other', 'en', 'Other countries')).toBe('Other countries');
  });
});

describe('marchNumbersFromAnswer', () => {
  it('reads the database answer into the page’s words', () => {
    const numbers = marchNumbersFromAnswer({
      counted_on: '2026-10-24',
      writers: 7,
      readers: 61,
      return_rate: 41.5,
      targets: { writers: 20, readers: 200, return_rate: 30 },
      writers_by_market: [
        { market: 'RO', count: 6 },
        { market: 'other', count: 1 },
      ],
      reads_per_day: [{ day: '2026-10-24', reads: 312 }],
    });
    expect(numbers.countedOn).toBe('2026-10-24');
    expect(numbers.returnRate).toBe(41.5);
    expect(numbers.writersByMarket).toEqual([
      { market: 'RO', count: 6 },
      { market: 'other', count: 1 },
    ]);
    expect(numbers.readsPerDay).toEqual([{ day: '2026-10-24', reads: 312 }]);
  });

  it('shows nothing counted yet, with the decided targets, before the first nightly count', () => {
    const numbers = marchNumbersFromAnswer({});
    expect(numbers.countedOn).toBeNull();
    expect(numbers.writers).toBeNull();
    expect(numbers.targets).toEqual({ writers: 20, readers: 200, returnRate: 30 });
    expect(numbers.readsPerDay).toEqual([]);
  });
});
