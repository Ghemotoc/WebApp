/**
 * Tests for browserReadingSettings: a signed-out visitor's settings kept in this browser
 * (BOOKS B04, user story 2.4: "remembered ... in the browser when signed out").
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultReadingSettings } from '../api/readingSettings';
import {
  readBrowserReadingSettings,
  readingSettingsStorageKey,
  settingsFromStored,
  storeBrowserReadingSettings,
} from './browserReadingSettings';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('a visitor’s reading settings in the browser', () => {
  it('gives the defaults when nothing was kept', () => {
    expect(readBrowserReadingSettings()).toEqual(defaultReadingSettings);
  });

  it('reads back what was kept', () => {
    const chosen = {
      ...defaultReadingSettings,
      paper: 'grey' as const,
      textSize: 22,
      readingRuler: true,
    };
    expect(storeBrowserReadingSettings(chosen)).toBe(true);
    expect(readBrowserReadingSettings()).toEqual(chosen);
  });

  it('puts the default back for a value that no longer fits, keeping the rest', () => {
    const settings = settingsFromStored({
      paper: 'night',
      font: 'sans',
      textSize: 99,
      timeLeft: 'page',
    });
    expect(settings.paper).toBe('sepia');
    expect(settings.font).toBe('sans');
    expect(settings.textSize).toBeNull();
    expect(settings.timeLeft).toBe('page');
  });

  it('keeps only times written as HH:MM', () => {
    const settings = settingsFromStored({ nightFrom: '22:00', nightUntil: 'late' });
    expect(settings.nightFrom).toBe('22:00');
    expect(settings.nightUntil).toBeNull();
  });

  it('gives the defaults for a broken copy and says why', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.setItem(readingSettingsStorageKey, '{not json');
    expect(readBrowserReadingSettings()).toEqual(defaultReadingSettings);
    expect(warn).toHaveBeenCalled();
  });

  it('says so when the browser refuses to keep them', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(storeBrowserReadingSettings(defaultReadingSettings)).toBe(false);
  });
});
