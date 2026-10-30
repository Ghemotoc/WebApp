/**
 * Tests for which saved places the reader is offered (story S1-E4-03).
 */
import { describe, expect, it } from 'vitest';

import { isPlaceWorthOffering } from './useSavedPlace';

describe('isPlaceWorthOffering', () => {
  it('offers a place part-way through a chapter, not at its very start or end', () => {
    expect(isPlaceWorthOffering(45)).toBe(true);
    expect(isPlaceWorthOffering(1)).toBe(false);
    expect(isPlaceWorthOffering(100)).toBe(false);
  });
});
