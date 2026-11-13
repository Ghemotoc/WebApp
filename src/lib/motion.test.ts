/**
 * Unit tests for the "Less motion" helpers (bundle MOTION-1). Who runs it: `npm test` (Vitest).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyLessMotion,
  deviceAsksForLessMotion,
  LESS_MOTION_STORAGE_KEY,
  readLessMotionChoice,
  saveLessMotionChoice,
  wantsLessMotion,
} from './motion';

/** Makes the device answer the reduced-motion question one way or the other. */
function setDeviceReducedMotion(isReduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: isReduced, addEventListener: vi.fn() }),
  );
}

afterEach(() => {
  window.localStorage.clear();
  applyLessMotion(false);
  vi.unstubAllGlobals();
});

describe('less motion', () => {
  it('is off until the member turns it on', () => {
    expect(readLessMotionChoice()).toBe(false);
  });

  it('remembers the switch on this device', () => {
    saveLessMotionChoice(true);
    expect(window.localStorage.getItem(LESS_MOTION_STORAGE_KEY)).toBe('on');
    expect(readLessMotionChoice()).toBe(true);
    saveLessMotionChoice(false);
    expect(readLessMotionChoice()).toBe(false);
  });

  it('treats a damaged stored value as off', () => {
    window.localStorage.setItem(LESS_MOTION_STORAGE_KEY, 'maybe');
    expect(readLessMotionChoice()).toBe(false);
  });

  it('marks the page while the switch is on and clears the mark when it goes off', () => {
    applyLessMotion(true);
    expect(document.documentElement).toHaveAttribute('data-motion', 'less');
    applyLessMotion(false);
    expect(document.documentElement).not.toHaveAttribute('data-motion');
  });

  it('keeps things still when the member asks, even on a device that allows motion', () => {
    setDeviceReducedMotion(false);
    expect(wantsLessMotion()).toBe(false);
    applyLessMotion(true);
    expect(wantsLessMotion()).toBe(true);
  });

  it('keeps things still when the device asks, even with the switch off', () => {
    setDeviceReducedMotion(true);
    expect(deviceAsksForLessMotion()).toBe(true);
    expect(wantsLessMotion()).toBe(true);
  });
});
