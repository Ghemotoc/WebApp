/**
 * OnlineStatusSwitch: "Show when I'm online" in Settings › Privacy (story S1-E13-01; board 6.3;
 * Q50: off unless the person turns it on).
 *
 * A checkbox saved the moment it changes; it shows at once and goes back if the save fails.
 * Turning it off also makes the database forget when the person was last active.
 * Who uses it: PrivacySettingsSection. What it calls: the onSave it is given.
 */
import { useState } from 'react';

import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the switch needs. */
interface OnlineStatusSwitchProps {
  saved: boolean;
  isSaving: boolean;
  onSave: (shouldShow: boolean) => Promise<void>;
}

/**
 * Renders the checkbox with its label and hint.
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
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-start gap-3">
        <input
          id="privacy-online-status"
          type="checkbox"
          checked={isOn}
          disabled={isSaving}
          aria-describedby="privacy-online-hint"
          onChange={(event) => void change(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="privacy-online-status" className="text-[15px] text-body">
          {t('online.label')}
        </label>
      </div>
      <p id="privacy-online-hint" className="m-0 text-[13px] text-meta">
        {t('online.hint')}
      </p>
    </div>
  );
}
