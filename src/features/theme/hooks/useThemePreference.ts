/**
 * useThemePreference: the reader's Device / Light / Night choice, applied to the page
 * (story S1-E1-03; Robert, 17 Oct 2026: follows the device by default, chosen in the footer).
 *
 * Who calls it: ThemeSelect in the footer.
 * What it calls: src/lib/theme.ts to read, save and apply the choice. With "Device", it also
 * listens for the operating system switching between light and dark, and follows it live.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  applyTheme,
  DEVICE_DARK_QUERY,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
} from '@/lib/theme';

/**
 * Reads the saved choice, keeps the page in step with it and lets the reader change it.
 *
 * @returns the current preference and a function to change it
 */
export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

  // Apply the theme now and whenever the preference changes.
  useEffect(() => {
    const deviceDarkQuery = window.matchMedia(DEVICE_DARK_QUERY);
    const applyCurrentTheme = () => applyTheme(resolveTheme(preference, deviceDarkQuery.matches));
    applyCurrentTheme();

    // Only "Device" needs to follow the operating system when it changes.
    if (preference !== 'device') return undefined;
    deviceDarkQuery.addEventListener('change', applyCurrentTheme);
    return () => deviceDarkQuery.removeEventListener('change', applyCurrentTheme);
  }, [preference]);

  /** Saves the new choice on this device and shows it. */
  const setPreference = useCallback((nextPreference: ThemePreference) => {
    saveThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  return { preference, setPreference };
}
