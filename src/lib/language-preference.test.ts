/**
 * Tests for the language kept in this browser (story S1-E1-04).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LANGUAGE_STORAGE_KEY,
  readDeviceLanguage,
  saveDeviceLanguage,
} from './language-preference';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('the language kept in this browser', () => {
  it('is Romanian on a first visit, whatever the browser language is', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');

    expect(readDeviceLanguage()).toBe('ro');
  });

  it('is the language chosen last time', () => {
    saveDeviceLanguage('en');

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(readDeviceLanguage()).toBe('en');
  });

  it('falls back to Romanian when the stored value is not an interface language', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');

    expect(readDeviceLanguage()).toBe('ro');
  });

  it('falls back to Romanian, without breaking, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readDeviceLanguage()).toBe('ro');
    expect(saveDeviceLanguage('en')).toBe(false);
  });
});
