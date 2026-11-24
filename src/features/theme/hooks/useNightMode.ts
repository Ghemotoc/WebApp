/**
 * useNightMode: whether the site is showing Night mode now, and the one switch that turns it on
 * or off (bundle NIGHT-2's footer button; shared with Reading settings in BOOKS B04, board
 * B04-ReaderSettings: "Night mode: turns the whole page dark, paper included").
 *
 * A member who leaves the mode on "Device" sees the mode the device shows now; switching then
 * picks light or night for good. It changes the same mode as Settings › Appearance
 * (useAppearance), so the footer, Reading settings and Settings never disagree.
 * Who calls it: NightModeButton (the footer) and ReadingSettingsPanel (the Night mode switch).
 * What it calls: useAppearance and resolveTheme (src/lib/theme.ts).
 */
import { DEVICE_DARK_QUERY, resolveTheme } from '@/lib/theme';

import { useAppearance } from './useAppearance';

/**
 * Reads whether the device is in dark mode now, safely where matchMedia is missing (old browsers,
 * some test set-ups).
 *
 * @returns true when the device asks for dark colours
 */
function deviceIsDarkNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DEVICE_DARK_QUERY).matches;
}

/**
 * Follows and switches Night mode.
 *
 * @returns isNightOn (true while night shows) and toggle() (picks the other mode and saves it,
 *   on the account when signed in, in the browser otherwise)
 */
export function useNightMode() {
  const { appearance, change } = useAppearance();
  // Step 1: is night showing now? "Device" follows the device's own setting.
  const isNightOn = resolveTheme(appearance.mode, deviceIsDarkNow()) === 'night';
  // Step 2: a switch picks the other mode.
  const toggle = () => void change({ mode: isNightOn ? 'light' : 'night' });
  return { isNightOn, toggle };
}
