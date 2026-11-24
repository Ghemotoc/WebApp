/**
 * Unit tests for the looks (bundle G2 THEMES): which themes there are, and what this device
 * remembers. Who runs it: `npm test` (Vitest, in a browser-like page).
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  LOOK_CHOICE_STORAGE_KEY,
  SHOWN_LOOK_STORAGE_KEY,
  applyLook,
  isYearRoundLook,
  readStoredLookChoice,
  saveStoredLookChoice,
} from './looks';

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.look;
});

describe('isYearRoundLook', () => {
  it('knows the six themes and nothing else, the retired seasonal looks included', () => {
    expect(isYearRoundLook('tmc')).toBe(true);
    expect(isYearRoundLook('autumn')).toBe(false);
    expect(isYearRoundLook('night')).toBe(false);
  });
});

describe('the choice on this device', () => {
  it('starts on Lilac mist', () => {
    expect(readStoredLookChoice()).toEqual({ look: 'lilac' });
  });

  it('remembers a saved choice', () => {
    expect(saveStoredLookChoice({ look: 'seaglass' })).toBe(true);
    expect(readStoredLookChoice()).toEqual({ look: 'seaglass' });
  });

  it('keeps the theme of a choice saved while the seasonal switch still existed', () => {
    window.localStorage.setItem(
      LOOK_CHOICE_STORAGE_KEY,
      JSON.stringify({ look: 'sorbet', isSeasonalOn: true }),
    );
    expect(readStoredLookChoice()).toEqual({ look: 'sorbet' });
  });

  it('ignores a damaged value', () => {
    window.localStorage.setItem(LOOK_CHOICE_STORAGE_KEY, '{not json');
    expect(readStoredLookChoice()).toEqual({ look: 'lilac' });
  });

  it('shows a look on the page and remembers it for the next first paint', () => {
    applyLook('pistachio');
    expect(document.documentElement.dataset.look).toBe('pistachio');
    expect(window.localStorage.getItem(SHOWN_LOOK_STORAGE_KEY)).toBe('pistachio');
  });
});
