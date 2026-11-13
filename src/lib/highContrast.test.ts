/**
 * Unit tests for the "High contrast" helpers (bundle CONTRAST-1). Who runs it: `npm test` (Vitest).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyHighContrast,
  deviceAsksForMoreContrast,
  HIGH_CONTRAST_STORAGE_KEY,
  readHighContrastChoice,
  saveHighContrastChoice,
  subscribeToDeviceContrast,
} from './highContrast';

afterEach(() => {
  window.localStorage.clear();
  applyHighContrast(false);
  vi.unstubAllGlobals();
});

describe('high contrast', () => {
  it('is off until the member turns it on', () => {
    expect(readHighContrastChoice()).toBe(false);
  });

  it('remembers the switch on this device', () => {
    saveHighContrastChoice(true);
    expect(window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY)).toBe('on');
    expect(readHighContrastChoice()).toBe(true);
    saveHighContrastChoice(false);
    expect(readHighContrastChoice()).toBe(false);
  });

  it('treats a damaged stored value as off', () => {
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, 'maybe');
    expect(readHighContrastChoice()).toBe(false);
  });

  it('marks the page while high contrast is on and clears the mark when it goes off', () => {
    applyHighContrast(true);
    expect(document.documentElement).toHaveAttribute('data-contrast', 'more');
    applyHighContrast(false);
    expect(document.documentElement).not.toHaveAttribute('data-contrast');
  });

  it('knows when the device asks for more contrast', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    expect(deviceAsksForMoreContrast()).toBe(true);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    expect(deviceAsksForMoreContrast()).toBe(false);
  });

  it('follows the device setting while someone listens, and stops when asked', () => {
    const query = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(query));
    const listener = vi.fn();
    const stop = subscribeToDeviceContrast(listener);
    expect(query.addEventListener).toHaveBeenCalledWith('change', listener);
    stop();
    expect(query.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
