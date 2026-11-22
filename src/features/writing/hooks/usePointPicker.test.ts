/**
 * Tests for the followers line's keyboard moves (bundle CALM-7b; design handover Step 4).
 */
import { describe, expect, it } from 'vitest';

import { nextPointFor } from './usePointPicker';

describe('nextPointFor', () => {
  it('starts at the newest point with Left and at the oldest with Right', () => {
    expect(nextPointFor('ArrowLeft', null, 5)).toBe(4);
    expect(nextPointFor('ArrowRight', null, 5)).toBe(0);
  });

  it('moves one point at a time and stops at either end', () => {
    expect(nextPointFor('ArrowLeft', 2, 5)).toBe(1);
    expect(nextPointFor('ArrowRight', 2, 5)).toBe(3);
    expect(nextPointFor('ArrowLeft', 0, 5)).toBe(0);
    expect(nextPointFor('ArrowRight', 4, 5)).toBe(4);
  });

  it('jumps to the ends with Home and End, and hides the tooltip with Escape', () => {
    expect(nextPointFor('Home', 3, 5)).toBe(0);
    expect(nextPointFor('End', 1, 5)).toBe(4);
    expect(nextPointFor('Escape', 3, 5)).toBeNull();
  });

  it('leaves other keys alone, so Tab still moves on', () => {
    expect(nextPointFor('Tab', 2, 5)).toBeUndefined();
    expect(nextPointFor('ArrowRight', null, 0)).toBeUndefined();
  });
});
