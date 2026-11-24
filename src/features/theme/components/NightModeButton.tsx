/**
 * NightModeButton: the mode switch in the member footer (bundle NIGHT-2; design files, every
 * page's footer: a quiet button beside the language drop-down).
 *
 * It is the quiet button (Button, secondary) and names the mode a press goes to: "Night mode" by
 * day, "Day mode" at night (the flat themes bundle, Robert, 23 Nov 2026). Because its words change
 * with the mode, it is a plain action button, not a pressed toggle (a toggle keeps one name and
 * says on or off; WCAG 4.1.2). A member who leaves the mode on "Device" sees the mode the device
 * shows now; pressing the button then picks light or night for good. Device stays a choice in Settings › Appearance, where the full
 * Device / Light / Night choice lives, and the staff footer keeps its drop-down (ThemeSelect).
 * It changes the same mode as Settings (useAppearance), so the two never disagree.
 * Who uses it: the member footer (src/app/shell/Footer.tsx).
 * What it calls: useAppearance and resolveTheme (src/lib/theme.ts).
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { DEVICE_DARK_QUERY, resolveTheme } from '@/lib/theme';

import { useAppearance } from '../hooks/useAppearance';

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
 * Renders the button and applies the change straight away.
 *
 * @returns the button
 */
export function NightModeButton() {
  const { t } = useTranslation();
  const { appearance, change } = useAppearance();

  // Step 1: is night showing now? "Device" follows the device's own setting.
  const isNightOn = resolveTheme(appearance.mode, deviceIsDarkNow()) === 'night';

  // Step 2: the button names the mode it goes to, the other one.
  const label = isNightOn ? t('theme.dayMode') : t('theme.nightMode');

  return (
    <Button
      type="button"
      variant="secondary"
      // Step 3: a press picks the other mode and saves it (on the account when signed in).
      onClick={() => void change({ mode: isNightOn ? 'light' : 'night' })}
    >
      {label}
    </Button>
  );
}
