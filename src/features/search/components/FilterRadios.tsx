/**
 * FilterRadios: one group of radio buttons under its name, for the search's filters and sort
 * (user story 1.8, board A08-SearchResults).
 *
 * Real radio buttons, so the choice shows by the dot and its words, never by colour alone
 * (WCAG 1.4.1), and the arrow keys move inside a group. An optional hint sits under the group
 * and is tied to it with aria-describedby.
 * Who uses it: SearchFilterFields and SearchRangeFilters.
 * What it calls: nothing; the parent applies the choice.
 */
import { useId, useState } from 'react';

/** One choice in a radio group. */
export interface RadioChoice {
  value: string;
  label: string;
}

/** What one radio group needs. */
export interface FilterRadiosProps {
  legend: string;
  choices: RadioChoice[];
  value: string;
  onChoose: (value: string) => void;
  /** A line under the choices, read out with the group. */
  hint?: string;
}

/**
 * One group of radio buttons under its name.
 *
 * @param props - the name, the choices, the one chosen, what to do on a change and a hint
 * @returns the fieldset
 */
export function FilterRadios({ legend, choices, value, onChoose, hint }: FilterRadiosProps) {
  const name = useId();
  const hintId = useId();
  // Step 1: the dot follows the click at once. The address changes inside a React transition
  // (React Router), so without this a controlled radio snaps back to the old choice until the
  // new address arrives, and on a slow device the dot visibly jumps back for a moment.
  const [shownValue, setShownValue] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  // Step 2: a new value from outside (Clear filters, Back, the sheet) replaces the shown one.
  if (value !== lastValue) {
    setLastValue(value);
    setShownValue(value);
  }
  return (
    <fieldset
      className="m-0 flex flex-col gap-1 border-0 p-0"
      aria-describedby={hint === undefined ? undefined : hintId}
    >
      <legend className="mb-2 p-0 type-label font-semibold text-ink-heading">{legend}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="flex min-h-11 cursor-pointer items-center gap-3 type-label text-ink"
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={choice.value === shownValue}
            onChange={() => {
              setShownValue(choice.value);
              onChoose(choice.value);
            }}
            className="size-5 shrink-0 accent-primary"
          />
          {choice.label}
        </label>
      ))}
      {hint !== undefined && (
        <p id={hintId} className="m-0 mt-1 type-meta text-ink-muted">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
