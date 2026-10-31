/**
 * Tests for reading the typed word target (story S1-E17-03).
 */
import { describe, expect, it } from 'vitest';

import { wordTargetFrom } from './wordTarget';

describe('the word target the writer types (S1-E17-03)', () => {
  it('reads a whole number, with Romanian or English thousands separators', () => {
    expect(wordTargetFrom('60000')).toBe(60000);
    expect(wordTargetFrom('90.000')).toBe(90000);
    expect(wordTargetFrom('90,000')).toBe(90000);
    expect(wordTargetFrom('90 000')).toBe(90000);
  });

  it('refuses nothing, zero, words and targets past five million', () => {
    expect(wordTargetFrom('')).toBeNull();
    expect(wordTargetFrom('0')).toBeNull();
    expect(wordTargetFrom('a lot')).toBeNull();
    expect(wordTargetFrom('5000001')).toBeNull();
  });
});
