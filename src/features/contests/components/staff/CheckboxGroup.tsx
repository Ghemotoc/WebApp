/**
 * CheckboxGroup: a labelled group of tick boxes for "Who can enter" (story S1-E11-15 criterion 1;
 * bundle CONTESTS-13b1).
 *
 * Each box is at least 44 px tall to tap (WCAG 2.2, 2.5.8 asks for 24 px; the pill system uses
 * 44). Who shows it: ContestWhoFields, once each for age groups, markets and story languages.
 */

/** One box. */
export interface CheckboxChoice {
  value: string;
  label: string;
  /** The label's own language, when it differs from the page's (WCAG 3.1.2). */
  lang?: string;
}

/** What the group needs. */
interface CheckboxGroupProps {
  legend: string;
  choices: CheckboxChoice[];
  chosen: string[];
  onChange: (chosen: string[]) => void;
}

/**
 * Renders the group.
 *
 * @returns a fieldset of tick boxes
 */
export function CheckboxGroup({ legend, choices, chosen, onChange }: CheckboxGroupProps) {
  /** Adds or removes one value, keeping the others. */
  const toggle = (value: string) =>
    onChange(
      chosen.includes(value) ? chosen.filter((other) => other !== value) : [...chosen, value],
    );
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-1 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-x-5">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-ink"
          >
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={chosen.includes(choice.value)}
              onChange={() => toggle(choice.value)}
            />
            <span lang={choice.lang}>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
