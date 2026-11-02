/**
 * SpaceRadioGroup: a fieldset of radio buttons, each with a label and an optional line under it
 * (bundle FORUMS-2, part a; S1-E8-06; the board's "Who can post" and "How people join" choices).
 *
 * Real radio buttons, so arrow keys move between choices and a screen reader says "1 of 2";
 * the legend is drawn as an eyebrow label (Cutive 14 px), as the DoD's form section labels are drawn. Each choice's row is
 * at least 44 px tall.
 * Who uses it: SpaceForm.
 */
import { useId } from 'react';

/** One choice. */
export interface SpaceRadioOption<Value extends string> {
  value: Value;
  label: string;
  /** A line under the label that says what the choice means. */
  note?: string;
}

/** What the group needs. */
interface SpaceRadioGroupProps<Value extends string> {
  legend: string;
  options: SpaceRadioOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}

/**
 * Renders the group.
 *
 * @returns the fieldset
 */
export function SpaceRadioGroup<Value extends string>({
  legend,
  options,
  value,
  onChange,
}: SpaceRadioGroupProps<Value>) {
  const groupName = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 font-eyebrow text-sm leading-[1.3] font-normal text-eyebrow">
        {legend}
      </legend>
      {options.map((option) => {
        const inputId = `${groupName}-${option.value}`;
        const noteId = option.note === undefined ? undefined : `${inputId}-note`;
        return (
          <div key={option.value} className="flex min-h-11 items-start gap-3">
            <input
              id={inputId}
              type="radio"
              name={groupName}
              className="mt-0.5 h-5 w-5 flex-none"
              checked={value === option.value}
              aria-describedby={noteId}
              onChange={() => onChange(option.value)}
            />
            <div className="flex flex-col gap-0.5">
              <label htmlFor={inputId} className="text-[15px] font-semibold text-heading">
                {option.label}
              </label>
              {option.note !== undefined && (
                <span id={noteId} className="text-sm text-body">
                  {option.note}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
