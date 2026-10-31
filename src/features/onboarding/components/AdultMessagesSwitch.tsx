/**
 * AdultMessagesSwitch: "Let adults message me", for 16 and 17-year-olds only (story S1-E2-06,
 * criterion 3; S1-E9-03 reads it; decided 16 Oct 2026, Q13).
 *
 * Who shows it: SafetyStep (setup, step 3) and AdultMessagesSettingsSection (Settings). What it
 * calls: useMyOnboarding.save({ kind: 'adultsMayMessage' }) → set_adults_may_message(), which
 * refuses anyone who isn't 16 or 17. It starts off and is saved the moment it is ticked. The box
 * shows the new state at once and goes back if the save fails, so it never looks stuck.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MyOnboarding } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';

/** What the switch needs. */
export interface AdultMessagesSwitchProps {
  /** Unique on the page, so the label and hint stay linked. */
  id: string;
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
}

/**
 * Renders the checkbox, its label and its hint.
 *
 * @returns the switch
 */
export function AdultMessagesSwitch({ id, onboarding, state }: AdultMessagesSwitchProps) {
  const { t } = useTranslation('account');
  const hintId = `${id}-hint`;
  const [isAllowed, setIsAllowed] = useState(onboarding.adultsMayMessage);

  /** Shows the new state, saves it, and puts the old one back if the save is refused. */
  async function change(allowed: boolean) {
    setIsAllowed(allowed);
    await state.save({ kind: 'adultsMayMessage', allowed }).catch(() => setIsAllowed(!allowed));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={isAllowed}
          disabled={state.isSaving}
          aria-describedby={hintId}
          onChange={(event) => void change(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor={id} className="text-[15px] text-body">
          {t('onboarding.safety.messagesSwitch')}
        </label>
      </div>
      <p id={hintId} className="m-0 text-[13px] text-meta">
        {t('onboarding.safety.messagesTeenBody')}
      </p>
    </div>
  );
}
