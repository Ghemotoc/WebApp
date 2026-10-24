/**
 * Unit tests for the phone link helpers (story S1-E10-13a).
 */
import { describe, expect, it } from 'vitest';

import { isTouchDevice, telephoneHref } from './phoneLink';

describe('telephoneHref', () => {
  it('keeps the digits and a leading plus, drops spaces and dashes', () => {
    expect(telephoneHref('116 111')).toBe('tel:116111');
    expect(telephoneHref('0800 801 200')).toBe('tel:0800801200');
    expect(telephoneHref('+44 20-7946 0000')).toBe('tel:+442079460000');
  });
});

describe('isTouchDevice', () => {
  it('is true for a coarse pointer and false otherwise or when matchMedia is missing', () => {
    const coarse = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    const fine = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    expect(isTouchDevice(coarse)).toBe(true);
    expect(isTouchDevice(fine)).toBe(false);
    expect(isTouchDevice(undefined)).toBe(false);
  });
});
