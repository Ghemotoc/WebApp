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
 * It changes the same mode as Settings and Reading settings (useNightMode), so they never disagree.
 * Who uses it: the member footer (src/app/shell/Footer.tsx).
 * What it calls: useNightMode.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { useNightMode } from '../hooks/useNightMode';

/**
 * Renders the button.
 *
 * @returns the quiet button naming the other mode
 */
export function NightModeButton() {
  const { t } = useTranslation();
  const { isNightOn, toggle } = useNightMode();
  // The button names the mode it goes to, the other one; a press picks it and saves it.
  const label = isNightOn ? t('theme.dayMode') : t('theme.nightMode');
  return (
    <Button type="button" variant="secondary" onClick={toggle}>
      {label}
    </Button>
  );
}
