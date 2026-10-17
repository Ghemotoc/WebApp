/**
 * Tests for light and night mode (story S1-E1-03).
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from './theme';

afterEach(() => {
  window.localStorage.clear();
});

describe('theme', () => {
  it('follows the device by default: night when the device is dark, light otherwise', () => {
    expect(readThemePreference()).toBe('device');
    expect(resolveTheme('device', true)).toBe('night');
    expect(resolveTheme('device', false)).toBe('light');
  });

  it('keeps an explicit choice whatever the device says', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('night', false)).toBe('night');
  });

  it('remembers the choice on this device', () => {
    saveThemePreference('night');

    expect(readThemePreference()).toBe('night');
  });

  it('ignores a stored value it does not recognise and follows the device', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');

    expect(readThemePreference()).toBe('device');
  });

  it('shows a theme by setting data-theme on the page', () => {
    applyTheme('night');

    expect(document.documentElement.dataset.theme).toBe('night');
  });
});
