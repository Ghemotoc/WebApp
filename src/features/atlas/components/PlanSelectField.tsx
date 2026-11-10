/**
 * PlanSelectField: a Story Atlas drop-down that saves as soon as the writer picks (stories
 * S1-E17-03 and S1-E17-06: genre, audience, writing status, publishing route).
 *
 * The shared drop-down (src/components/ui/Select.tsx, DoD drop-down rule) with its label shown,
 * and the save note under it. A pick is saved at once: there is nothing to type, so no pause.
 * Who uses it: StoryDetailsSection. What it calls: useAutosaveField with the save it is given.
 */
import { Select, type SelectOption } from '@/components/ui/Select';

import { useAutosaveField } from '../hooks/useAutosaveField';

import { SaveNote } from './SaveNote';

/** What the field needs. */
export interface PlanSelectFieldProps {
  id: string;
  label: string;
  /** A short line under the drop-down saying what the pick does; read with it. */
  hint?: string;
  options: SelectOption[];
  savedValue: string;
  /** Saves the picked value; throws when it can't. */
  save: (value: string) => Promise<void>;
}

/**
 * Renders the drop-down and its save note.
 *
 * @returns the label, the drop-down, the hint when there is one, and the note
 */
export function PlanSelectField({
  id,
  label,
  hint,
  options,
  savedValue,
  save,
}: PlanSelectFieldProps) {
  const field = useAutosaveField({ savedValue, save });

  /** Takes the pick and saves it straight away. */
  function pick(value: string) {
    field.change(value);
    void field.flush();
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Select
        id={id}
        label={label}
        isLabelVisible
        options={options}
        value={field.value}
        onChange={pick}
        descriptionId={hint === undefined ? undefined : `${id}-hint`}
      />
      {hint !== undefined && (
        <p id={`${id}-hint`} className="m-0 text-sm text-meta">
          {hint}
        </p>
      )}
      <SaveNote id={`${id}-save`} status={field.status} />
    </div>
  );
}
