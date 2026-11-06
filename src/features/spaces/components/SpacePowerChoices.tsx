/**
 * SpacePowerChoices: the powers a moderator can hold, as checkboxes with a line under each
 * (bundle FORUMS-2, part b; S1-E8-07 criterion 1: "the owner chooses each moderator's powers").
 *
 * Real checkboxes in a fieldset, so a screen reader says the group's name with each one; the
 * legend is drawn as an eyebrow label (the eyebrow style), as the DoD's form section labels are drawn.
 * Each row is at least 44 px tall.
 * Who uses it: SpaceModeratorsCard (adding a moderator and changing one's powers).
 */
import { useId } from 'react';

import { spacePowers, type SpacePower } from '../api/spaces';
import { togglePower } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the choices need. */
interface SpacePowerChoicesProps {
  legend: string;
  value: SpacePower[];
  onChange: (powers: SpacePower[]) => void;
}

/**
 * Renders the group.
 *
 * @returns the fieldset
 */
export function SpacePowerChoices({ legend, value, onChange }: SpacePowerChoicesProps) {
  const { t } = useSpacesTranslation();
  const groupId = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-2 p-0 eyebrow">{legend}</legend>
      {spacePowers.map((power) => {
        const inputId = `${groupId}-${power}`;
        return (
          <div key={power} className="flex min-h-11 items-start gap-3">
            <input
              id={inputId}
              type="checkbox"
              className="mt-0.5 h-5 w-5 flex-none"
              checked={value.includes(power)}
              aria-describedby={`${inputId}-note`}
              onChange={(event) => onChange(togglePower(value, power, event.target.checked))}
            />
            <div className="flex flex-col gap-0.5">
              <label htmlFor={inputId} className="text-[15px] font-semibold text-heading">
                {t(`moderators.powers.${power}`)}
              </label>
              <span id={`${inputId}-note`} className="text-sm text-body">
                {t(`moderators.powerNotes.${power}`)}
              </span>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
