/**
 * PersonalDetailsSwitch: "Ask before I share contact details" in Settings › Privacy (bundle MUST-1,
 * part b; IDEA-20261108-6: "Adults can switch it on too").
 *
 * A switch (SettingSwitchRow, G11b) saved the moment it changes, like "Show when I'm online". Under
 * 18 it is on and can't be turned off, so the switch is on and disabled with a line saying why; the
 * database refuses the change too (set_checks_personal_details(), hint under_18).
 * Who uses it: PrivacySettingsSection. What it calls: the onSave it is given.
 */
import { useState } from 'react';

import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';

import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the switch needs. */
interface PersonalDetailsSwitchProps {
  saved: boolean;
  isUnder18: boolean;
  isSaving: boolean;
  onSave: (shouldCheck: boolean) => Promise<void>;
}

/**
 * Renders the switch with its name and hint.
 *
 * @returns the switch row
 */
export function PersonalDetailsSwitch({
  saved,
  isUnder18,
  isSaving,
  onSave,
}: PersonalDetailsSwitchProps) {
  const { t } = usePrivacyTranslation();
  const [isOn, setIsOn] = useState(saved);

  /** Shows the new state, saves it, and puts the old one back if the save is refused. */
  async function change(shouldCheck: boolean) {
    setIsOn(shouldCheck);
    await onSave(shouldCheck).catch(() => setIsOn(!shouldCheck));
  }

  return (
    <SettingSwitchRow
      id="privacy-personal-details"
      label={t('personalDetails.label')}
      hint={t(isUnder18 ? 'personalDetails.hintUnder18' : 'personalDetails.hint')}
      isOn={isUnder18 || isOn}
      stateWord={t(isUnder18 || isOn ? 'settings.on' : 'settings.off')}
      isDisabled={isUnder18 || isSaving}
      onToggle={() => void change(!isOn)}
    />
  );
}
