/**
 * OnlineStatusSwitch: "Show when I'm online" in Settings › Privacy (story S1-E13-01; board 6.3;
 * Q50: off unless the person turns it on).
 *
 * A switch (SettingSwitchRow, G11b) saved the moment it changes; it shows at once and goes back if
 * the save fails. Turning it off also makes the database forget when the person was last active.
 * Who uses it: PrivacySettingsSection. What it calls: the onSave it is given.
 */
import { useState } from 'react';

import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';

import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the switch needs. */
interface OnlineStatusSwitchProps {
  saved: boolean;
  isSaving: boolean;
  onSave: (shouldShow: boolean) => Promise<void>;
}

/**
 * Renders the switch with its name and hint.
 *
 * @returns the switch row
 */
export function OnlineStatusSwitch({ saved, isSaving, onSave }: OnlineStatusSwitchProps) {
  const { t } = usePrivacyTranslation();
  const [isOn, setIsOn] = useState(saved);

  /** Shows the new state, saves it, and puts the old one back if the save is refused. */
  async function change(shouldShow: boolean) {
    setIsOn(shouldShow);
    await onSave(shouldShow).catch(() => setIsOn(!shouldShow));
  }

  return (
    <SettingSwitchRow
      id="privacy-online"
      label={t('online.label')}
      hint={t('online.hint')}
      isOn={isOn}
      stateWord={t(isOn ? 'settings.on' : 'settings.off')}
      isDisabled={isSaving}
      onToggle={() => void change(!isOn)}
    />
  );
}
