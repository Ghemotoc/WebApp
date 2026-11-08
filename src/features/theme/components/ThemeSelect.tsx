/**
 * ThemeSelect: the Device / Light / Night drop-down in the footer (story S1-E1-03).
 *
 * Decision (Robert, 17 Oct 2026): night mode follows the device by default; the footer has this
 * drop-down; there is no switch in the top bar. No board draws it, so it follows the footer's
 * language drop-down (a visible label and the one Select style) and is noted in
 * docs/board-fixes.md.
 * Since bundle G2 it changes the same mode as Settings › Appearance, saved on the account for a
 * signed-in member (useAppearance), so the two never disagree.
 * Who uses it: the footer (src/app/shell/Footer.tsx) and the staff footer.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { isThemePreference, themePreferences } from '@/lib/theme';

import { useAppearance } from '../hooks/useAppearance';

/**
 * Renders the labelled drop-down and applies the choice straight away.
 *
 * @returns the drop-down
 */
export function ThemeSelect() {
  const { t } = useTranslation();
  const { appearance, change } = useAppearance();

  // Each option's label comes from the locale files (theme.device, theme.light, theme.night).
  const options = themePreferences.map((value) => ({ value, label: t(`theme.${value}`) }));

  return (
    <Select
      id="theme-select"
      label={t('theme.label')}
      isLabelVisible
      placement="bar"
      options={options}
      value={appearance.mode}
      onChange={(value) => {
        // The drop-down only offers valid values; the check keeps TypeScript and any surprise safe.
        if (isThemePreference(value)) void change({ mode: value });
      }}
    />
  );
}
