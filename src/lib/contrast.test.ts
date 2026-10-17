/**
 * Tests for the WCAG contrast maths (story S1-E1-03).
 */
import { describe, expect, it } from 'vitest';

import { contrastRatio, hexToRgb } from './contrast';

describe('contrastRatio', () => {
  it('gives 21 for black on white, the highest possible', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('gives 1 for a colour on itself', () => {
    expect(contrastRatio('#481C5F', '#481C5F')).toBe(1);
  });

  it('matches the known ratio of the meta colour on paper (about 5.94)', () => {
    expect(contrastRatio('#6B5A73', '#FAF8F5')).toBeCloseTo(5.94, 2);
  });

  it('reads the short #rgb form the build uses, so #fff is white', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('refuses a colour that is not #rrggbb, with a clear message', () => {
    expect(() => hexToRgb('plum')).toThrow('"plum" is not a #rrggbb colour.');
  });
});
