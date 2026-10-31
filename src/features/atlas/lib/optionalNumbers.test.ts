/**
 * Unit tests for the chapter plan's number boxes (story S1-E17-24; lib/optionalNumbers.ts).
 */
import { describe, expect, it } from 'vitest';

import { chapterTargetFrom, sortValueFrom } from './optionalNumbers';

describe('chapterTargetFrom', () => {
  it('reads an empty box as no target', () => {
    expect(chapterTargetFrom('  ')).toEqual({ isValid: true, value: null });
  });

  it('reads a whole number with separators', () => {
    expect(chapterTargetFrom('3,000')).toEqual({ isValid: true, value: 3000 });
    expect(chapterTargetFrom('3 000')).toEqual({ isValid: true, value: 3000 });
  });

  it('refuses words, zero and targets over a million', () => {
    expect(chapterTargetFrom('mult').isValid).toBe(false);
    expect(chapterTargetFrom('0').isValid).toBe(false);
    expect(chapterTargetFrom('1000001').isValid).toBe(false);
  });
});

describe('sortValueFrom', () => {
  it('reads an empty box as no sort value', () => {
    expect(sortValueFrom('')).toEqual({ isValid: true, value: null });
  });

  it('reads negative and decimal numbers, with a comma or a dot', () => {
    expect(sortValueFrom('-12')).toEqual({ isValid: true, value: -12 });
    expect(sortValueFrom('3,5')).toEqual({ isValid: true, value: 3.5 });
    expect(sortValueFrom('3.5')).toEqual({ isValid: true, value: 3.5 });
  });

  it('refuses words', () => {
    expect(sortValueFrom('anul trei').isValid).toBe(false);
  });
});
