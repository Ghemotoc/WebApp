/**
 * ModeChoice: Light, Night or Match my device in Settings › Appearance (bundle G2 THEMES; design/
 * boards Settings.dc.html, "Mode"), drawn with the shared water-bubble segmented control from
 * bundle G3 (a radio group: arrow keys move, Space picks).
 * Who shows it: AppearanceSettingsSection. What it calls: SegmentedControl; it reports the pick
 * upwards.
 */
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { ThemePreference } from '@/lib/theme';

/** The modes in the board's order. */
const modesInOrder: readonly ThemePreference[] = ['light', 'night', 'device'];

/** What the choice needs. */
export interface ModeChoiceProps {
  picked: ThemePreference;
  onPick: (mode: ThemePreference) => void;
}

/**
 * Renders the group.
 *
 * @returns the segmented control
 */
export function ModeChoice({ picked, onPick }: ModeChoiceProps) {
  const { t } = useTranslation();
  const options = modesInOrder.map((mode) => ({
    value: mode,
    label: t(`appearance.modes.${mode}`),
  }));
  return (
    <SegmentedControl
      legend={t('appearance.modeLegend')}
      name="appearance-mode"
      options={options}
      value={picked}
      onChange={onPick}
    />
  );
}
