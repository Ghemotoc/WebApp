/**
 * HighContrastRow: the "High contrast" switch in Settings › Appearance, with its name and a line
 * saying what it does (bundle CONTRAST-1; Robert, 13 Nov 2026; idea IDEA-20261113-14).
 *
 * Why it exists: the themes are soft pastels that meet WCAG 2.2 AA (4.5:1). Some people need
 * more: this switch draws plain white pages (black at night) with black text, dark edges and no
 * see-through glass, and keeps the chosen theme in its deep accent (WCAG 2.2, 1.4.6 Contrast
 * (Enhanced), 7:1). A device can ask for the same by itself; many people don't know that setting,
 * and a school or shared computer often can't be changed.
 * On a device that already asks for more contrast the switch shows as on and can't be turned off
 * here: the device's setting always counts, and saying so is more honest than a switch that would
 * do nothing.
 * Who shows it: AppearanceSettingsSection. What it calls: the shared SwitchButton and
 * src/lib/highContrast.ts; it reports the click upwards.
 */
import { useSyncExternalStore } from 'react';

import { SwitchButton } from '@/features/settings/components/SwitchButton';
import { deviceAsksForMoreContrast, subscribeToDeviceContrast } from '@/lib/highContrast';

import { useAppearanceTranslation } from '../registerAppearanceTranslations';

/** What the row needs. */
export interface HighContrastRowProps {
  /** Whether the member turned the switch on. */
  isOn: boolean;
  /** Called when the member clicks the switch. */
  onToggle: () => void;
}

/**
 * Renders the row.
 *
 * @param props.isOn - the member's own choice
 * @param props.onToggle - flips the choice
 * @returns the switch with its name and hint
 */
export function HighContrastRow({ isOn, onToggle }: HighContrastRowProps) {
  const { t } = useAppearanceTranslation();
  // Step 1: follow the device's own setting live, so the row is right the moment it changes.
  const isDeviceAsking = useSyncExternalStore(subscribeToDeviceContrast, deviceAsksForMoreContrast);
  // Step 2: the device's setting counts by itself, so the switch shows on and stays put.
  const isShownOn = isOn || isDeviceAsking;
  const hintKey = isDeviceAsking ? 'highContrastDeviceHint' : 'highContrastHint';
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ink">{t('highContrastLabel')}</span>
        <span id="appearance-high-contrast-hint" className="text-[13px] text-meta">
          {t(hintKey)}
        </span>
      </span>
      <SwitchButton
        label={t('highContrastLabel')}
        isOn={isShownOn}
        stateWord={t(isShownOn ? 'on' : 'off')}
        isDisabled={isDeviceAsking}
        onToggle={onToggle}
        describedBy="appearance-high-contrast-hint"
      />
    </div>
  );
}
