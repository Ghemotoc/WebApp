/**
 * Unit tests for the looks (bundle G2 THEMES): which look shows on which day, and what this
 * device remembers. Who runs it: `npm test` (Vitest, in a browser-like page).
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  LOOK_CHOICE_STORAGE_KEY,
  SHOWN_LOOK_STORAGE_KEY,
  applyLook,
  decidedSeasonalWindows,
  isShownLook,
  parseSeasonalWindows,
  readStoredLookChoice,
  saveStoredLookChoice,
  seasonalLookOn,
  shownLookFor,
} from './looks';

/** A day in the device's time zone (months count from 1 here, unlike Date). */
function day(month: number, date: number): Date {
  return new Date(2027, month - 1, date, 12, 0, 0);
}

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.look;
});

describe('seasonalLookOn', () => {
  it('starts winter on 8 January, after the festive weeks', () => {
    expect(seasonalLookOn(day(1, 7), decidedSeasonalWindows)).toBeNull();
    expect(seasonalLookOn(day(1, 8), decidedSeasonalWindows)).toBe('winter');
  });

  it('includes the first and last day of each season', () => {
    expect(seasonalLookOn(day(3, 1), decidedSeasonalWindows)).toBe('spring');
    expect(seasonalLookOn(day(5, 31), decidedSeasonalWindows)).toBe('spring');
    expect(seasonalLookOn(day(8, 31), decidedSeasonalWindows)).toBe('summer');
    expect(seasonalLookOn(day(11, 30), decidedSeasonalWindows)).toBe('autumn');
  });

  it('shows no season in December', () => {
    expect(seasonalLookOn(day(12, 15), decidedSeasonalWindows)).toBeNull();
  });

  it('handles a window that crosses the new year', () => {
    const windows = [{ look: 'winter' as const, from: '12-15', to: '01-06' }];
    expect(seasonalLookOn(day(12, 20), windows)).toBe('winter');
    expect(seasonalLookOn(day(1, 3), windows)).toBe('winter');
    expect(seasonalLookOn(day(1, 7), windows)).toBeNull();
  });
});

describe('shownLookFor', () => {
  it('keeps the member’s theme while seasonal themes are off', () => {
    expect(shownLookFor('sorbet', false, day(7, 1), decidedSeasonalWindows)).toBe('sorbet');
  });

  it('shows the season’s look when seasonal themes are on and a season is running', () => {
    expect(shownLookFor('sorbet', true, day(7, 1), decidedSeasonalWindows)).toBe('summer');
  });

  it('falls back to the member’s theme between seasons', () => {
    expect(shownLookFor('candy', true, day(12, 24), decidedSeasonalWindows)).toBe('candy');
  });
});

describe('parseSeasonalWindows', () => {
  it('reads the setting’s shape', () => {
    expect(parseSeasonalWindows([{ look: 'spring', from: '03-01', to: '05-31' }])).toEqual([
      { look: 'spring', from: '03-01', to: '05-31' },
    ]);
  });

  it('refuses anything else, so the decided windows are used', () => {
    expect(parseSeasonalWindows([{ look: 'lilac', from: '03-01', to: '05-31' }])).toBeNull();
    expect(parseSeasonalWindows([{ look: 'spring', from: '13-01', to: '05-31' }])).toBeNull();
    expect(parseSeasonalWindows('spring')).toBeNull();
  });
});

describe('isShownLook', () => {
  it('knows the ten looks and nothing else', () => {
    expect(isShownLook('tmc')).toBe(true);
    expect(isShownLook('autumn')).toBe(true);
    expect(isShownLook('night')).toBe(false);
  });
});

describe('the choice on this device', () => {
  it('starts on Lilac mist with seasonal themes off', () => {
    expect(readStoredLookChoice()).toEqual({ look: 'lilac', isSeasonalOn: false });
  });

  it('remembers a saved choice', () => {
    expect(saveStoredLookChoice({ look: 'seaglass', isSeasonalOn: true })).toBe(true);
    expect(readStoredLookChoice()).toEqual({ look: 'seaglass', isSeasonalOn: true });
  });

  it('ignores a damaged value', () => {
    window.localStorage.setItem(LOOK_CHOICE_STORAGE_KEY, '{not json');
    expect(readStoredLookChoice()).toEqual({ look: 'lilac', isSeasonalOn: false });
  });

  it('shows a look on the page and remembers it for the next first paint', () => {
    applyLook('pistachio');
    expect(document.documentElement.dataset.look).toBe('pistachio');
    expect(window.localStorage.getItem(SHOWN_LOOK_STORAGE_KEY)).toBe('pistachio');
  });
});
