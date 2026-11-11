/**
 * ReadingSuggestionsSwitch: "Suggestions from reading" in Settings › Privacy (story S1-E15-06,
 * bundle ANALYTICS-1c; criterion 5).
 *
 * A switch (SettingSwitchRow, G11b) saved the moment it changes. On means the member's finished
 * stories count, as totals with no names, towards "Stories like this", and Discover shows
 * "Because you read". It starts on for adults and off for anyone under 18, who may turn it on
 * themselves (the database sets the default, suggests_from_reading_of()).
 * Who uses it: PrivacySettingsSection. What it calls: the onSave it is given
 * (set_suggests_from_reading()).
 */
import { useState } from 'react';

import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';

import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the switch needs. */
interface ReadingSuggestionsSwitchProps {
  saved: boolean;
  isSaving: boolean;
  onSave: (shouldSuggest: boolean) => Promise<void>;
}

/**
 * Renders the switch with its name and hint.
 *
 * @returns the switch row
 */
export function ReadingSuggestionsSwitch({
  saved,
  isSaving,
  onSave,
}: ReadingSuggestionsSwitchProps) {
  const { t } = usePrivacyTranslation();
  const [isOn, setIsOn] = useState(saved);

  /** Shows the new state, saves it, and puts the old one back if the save is refused. */
  async function change(shouldSuggest: boolean) {
    setIsOn(shouldSuggest);
    await onSave(shouldSuggest).catch(() => setIsOn(!shouldSuggest));
  }

  return (
    <SettingSwitchRow
      id="privacy-reading-suggestions"
      label={t('readingSuggestions.label')}
      hint={t('readingSuggestions.hint')}
      isOn={isOn}
      stateWord={t(isOn ? 'settings.on' : 'settings.off')}
      isDisabled={isSaving}
      onToggle={() => void change(!isOn)}
    />
  );
}
