/**
 * High contrast: whether the app should draw itself in plain, strongly contrasting colours, and
 * remembering the member's choice (bundle CONTRAST-1; Robert, 13 Nov 2026: "people should still be
 * able to use the themes they like, but at high contrast ... a clickable option ... in the
 * settings", and his choice the same day: "Build, plain white pages").
 *
 * Two things can ask for high contrast, and either one is enough:
 * - the device (the operating system's "increase contrast" setting, which browsers report as
 *   prefers-contrast: more);
 * - the member, with the "High contrast" switch in Settings › Appearance, for people who don't
 *   know the device setting or can't change it (a school or shared computer).
 * The switch can only add contrast: it never takes it away on a device that asked for more.
 * Why: WCAG 2.2, 1.4.6 Contrast (Enhanced) asks for 7:1 text; the pastel themes meet 4.5:1 (AA).
 *
 * Who calls it: src/features/theme/ (the appearance store, useAccountAppearance and the Settings
 * section). public/theme-init.js repeats readHighContrastChoice, deviceAsksForMoreContrast and
 * applyHighContrast before the page draws; keep HIGH_CONTRAST_STORAGE_KEY, the media query and the
 * attribute the same in both files.
 * What it changes: the data-contrast attribute on <html>, which picks the high contrast colours in
 * src/styles/tokens.css and the flat, solid surfaces in src/styles/index.css.
 */

/** The localStorage key; public/theme-init.js uses the same one. */
export const HIGH_CONTRAST_STORAGE_KEY = 'high-contrast';

/** The media query that is true when the device asks for more contrast. */
export const DEVICE_MORE_CONTRAST_QUERY = '(prefers-contrast: more)';

/**
 * Reads whether the member turned "High contrast" on, as this device remembers it.
 *
 * @returns true when the switch was left on; false when it is off, was never used, or storage is
 *   blocked (a private window)
 */
export function readHighContrastChoice(): boolean {
  try {
    return window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

/**
 * Remembers the switch on this device.
 *
 * @param isOn - whether "High contrast" is on
 * @returns true when it was saved; false when storage is unavailable (the choice then lasts until
 *   the page closes; for a signed-in member it is on the account anyway)
 */
export function saveHighContrastChoice(isOn: boolean): boolean {
  try {
    window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, isOn ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}

/**
 * Says whether the device itself asks for more contrast.
 *
 * @returns true when it does; false when it doesn't or the browser can't say
 */
export function deviceAsksForMoreContrast(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DEVICE_MORE_CONTRAST_QUERY).matches;
}

/**
 * Listens for the device switching its contrast setting, for useSyncExternalStore and for the
 * hook that keeps the page in step.
 *
 * @param listener - called when the setting changes
 * @returns a function that stops listening
 */
export function subscribeToDeviceContrast(listener: () => void): () => void {
  // Some test browsers have no matchMedia: nothing to follow.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const query = window.matchMedia(DEVICE_MORE_CONTRAST_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/**
 * Draws the page in high contrast, or back in the theme's own colours, by setting (or removing)
 * data-contrast="more" on <html>. Unlike "Less motion", CSS can't join the device's wish and the
 * member's switch by itself (the colours sit under one attribute), so the caller passes both.
 *
 * @param isOn - whether the member's switch is on or the device asks for more contrast
 */
export function applyHighContrast(isOn: boolean): void {
  if (isOn) {
    document.documentElement.dataset.contrast = 'more';
    return;
  }
  delete document.documentElement.dataset.contrast;
}
