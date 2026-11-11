/**
 * AudienceRadios: one "who can see this" radio group for Settings › Privacy (story S1-E13-01;
 * board 6.3), used for the profile and the library.
 *
 * The choice is saved the moment one is picked. It shows at once and goes back if the save fails,
 * so it never looks stuck (as MessageSettingsSection, S1-E9-04). The under-18 default carries the
 * "Default for under 18" pill, as on the board; the pill is information, not a control. Each
 * choice is a glass row and the chosen one has a plum border (choiceRowStyles, G11b).
 * Who uses it: PrivacySettingsSection. What it calls: the onSave it is given.
 */
import { useState } from 'react';

import { choiceRowClassName } from '@/components/ui/choiceRowStyles';
import { InfoPill } from '@/components/ui/InfoPill';

import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the group needs. */
interface AudienceRadiosProps<Choice extends string> {
  /** Names the inputs and the hint, so two groups on one page never clash. */
  name: string;
  legend: string;
  hint: string;
  choices: readonly Choice[];
  /** The label of each choice. */
  labelOf: (choice: Choice) => string;
  /** The choice an under-18 starts on, which gets the pill; left out when everyone starts alike. */
  under18Default?: Choice;
  saved: Choice;
  isSaving: boolean;
  onSave: (choice: Choice) => Promise<void>;
}

/**
 * Renders the fieldset.
 *
 * @returns the radio group with its legend and hint
 */
export function AudienceRadios<Choice extends string>(props: AudienceRadiosProps<Choice>) {
  const { t } = usePrivacyTranslation();
  const { name, legend, hint, choices, labelOf, under18Default, saved, isSaving, onSave } = props;
  const [chosen, setChosen] = useState(saved);

  /** Shows the new choice, saves it, and puts the old one back if the save is refused. */
  async function choose(choice: Choice) {
    const before = chosen;
    setChosen(choice);
    await onSave(choice).catch(() => setChosen(before));
  }

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={`${name}-hint`}>
      <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">{legend}</legend>
      {choices.map((choice) => (
        <label key={choice} className={choiceRowClassName}>
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name={name}
              value={choice}
              checked={chosen === choice}
              disabled={isSaving}
              onChange={() => void choose(choice)}
              className="size-6 shrink-0 cursor-pointer accent-(--link)"
            />
            {labelOf(choice)}
          </span>
          {choice === under18Default && (
            <InfoPill tone="plum">{t('settings.defaultForUnder18')}</InfoPill>
          )}
        </label>
      ))}
      <p id={`${name}-hint`} className="m-0 text-[13px] text-meta">
        {hint}
      </p>
    </fieldset>
  );
}
