/**
 * PersonalDetailsSwitch: "Ask before I share contact details" in Settings › Privacy (bundle MUST-1,
 * part b; IDEA-20261108-6: "Adults can switch it on too").
 *
 * A checkbox saved the moment it changes, like "Show when I'm online". Under 18 it is on and
 * can't be turned off, so the box is ticked and disabled with a line saying why; the database
 * refuses the change too (set_checks_personal_details(), hint under_18).
 * Who uses it: PrivacySettingsSection. What it calls: the onSave it is given.
 */
import { useState } from 'react';

import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the switch needs. */
interface PersonalDetailsSwitchProps {
  saved: boolean;
  isUnder18: boolean;
  isSaving: boolean;
  onSave: (shouldCheck: boolean) => Promise<void>;
}

/**
 * Renders the checkbox with its label and hint.
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
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-start gap-3">
        <input
          id="privacy-personal-details"
          type="checkbox"
          checked={isUnder18 || isOn}
          disabled={isUnder18 || isSaving}
          aria-describedby="privacy-personal-details-hint"
          onChange={(event) => void change(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link) disabled:cursor-default"
        />
        <label htmlFor="privacy-personal-details" className="text-[15px] text-body">
          {t('personalDetails.label')}
        </label>
      </div>
      <p id="privacy-personal-details-hint" className="m-0 text-[13px] text-meta">
        {t(isUnder18 ? 'personalDetails.hintUnder18' : 'personalDetails.hint')}
      </p>
    </div>
  );
}
