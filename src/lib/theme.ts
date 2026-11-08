/**
 * Light and night mode: which one to show, and remembering the reader's choice (story S1-E1-03).
 *
 * Decision (Robert, 17 Oct 2026): night mode follows the device setting by default; the footer
 * has a Device / Light / Night drop-down; there is no switch in the top bar.
 * The choice is kept on this device only (localStorage). It is a comfort setting, not account
 * data, so it is never sent anywhere.
 *
 * Who calls it: src/features/theme/ (the appearance store and useAccountAppearance, bundle G2).
 * public/theme-init.js repeats the first two steps before the page draws, so night readers never
 * see a white flash; keep THEME_STORAGE_KEY and the attribute name the same in both files.
 * What it changes: the data-theme attribute on <html>, which picks the token set in
 * src/styles/tokens.css.
 */

/** What the reader picked in the footer. */
export type ThemePreference = 'device' | 'light' | 'night';

/** What is actually shown. */
export type ResolvedTheme = 'light' | 'night';

/** The localStorage key; public/theme-init.js uses the same one. */
export const THEME_STORAGE_KEY = 'theme-preference';

/** The media query that is true when the device is set to dark mode. */
export const DEVICE_DARK_QUERY = '(prefers-color-scheme: dark)';

/** Every preference, in the order the drop-down lists them. */
export const themePreferences: readonly ThemePreference[] = ['device', 'light', 'night'];

/**
 * Says whether a stored value is a valid preference.
 *
 * @param value - anything read from storage
 * @returns true for 'device', 'light' or 'night'
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

/**
 * Reads the saved preference. Storage can be blocked (private windows, strict settings), so a
 * failure falls back to following the device rather than breaking the page.
 *
 * @returns the saved preference, or 'device' when none is saved or storage is unavailable
 */
export function readThemePreference(): ThemePreference {
  try {
    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedValue) ? storedValue : 'device';
  } catch {
    return 'device';
  }
}

/**
 * Saves the preference on this device.
 *
 * @param preference - the reader's choice
 * @returns true when it was saved; false when storage is unavailable (the choice then lasts only
 *   until the page is closed, which the drop-down accepts silently: nothing breaks)
 */
export function saveThemePreference(preference: ThemePreference): boolean {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

/**
 * Works out which theme to show.
 *
 * @param preference - the reader's choice
 * @param deviceIsDark - whether the device is set to dark mode
 * @returns 'night' or 'light'
 */
export function resolveTheme(preference: ThemePreference, deviceIsDark: boolean): ResolvedTheme {
  if (preference === 'device') {
    return deviceIsDark ? 'night' : 'light';
  }
  return preference;
}

/**
 * Shows a theme by setting data-theme on <html>.
 *
 * @param theme - the theme to show
 */
export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
}
