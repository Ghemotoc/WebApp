/**
 * SpaceNameField: the space's name, checked as the owner types: "This name is available." or
 * why not (bundle FORUMS-2, part a; S1-E8-06 criterion 2: "each name can only be used once").
 *
 * The check waits for a pause in typing, and the database checks again when the form is sent.
 * The answer sits in a polite live region, so a screen reader hears it without moving focus.
 * Who uses it: SpaceForm. What it calls: useSpaceNameCheck → space_name_available().
 */
import { useId } from 'react';

import { TextInput } from '@/components/ui/TextInput';

import type { SpaceFieldProblem } from '../api/spaces';
import { useSpaceNameCheck } from '../hooks/useSpaceNameCheck';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the field needs. */
interface SpaceNameFieldProps {
  value: string;
  onChange: (name: string) => void;
  /** The space's own name when changing it (it is not "taken" by itself), else null. */
  ownName: string | null;
  /** The name's problem from the last time the form was sent, or null. */
  sentProblem: SpaceFieldProblem | null;
}

/**
 * Renders the field and the check's answer.
 *
 * @returns the text field with its hint, error and live answer
 */
export function SpaceNameField({ value, onChange, ownName, sentProblem }: SpaceNameFieldProps) {
  const { t } = useSpacesTranslation();
  const id = useId();
  const check = useSpaceNameCheck(value, ownName);
  const problem = check.problem ?? sentProblem;
  return (
    <div className="flex flex-col gap-1.5">
      <TextInput
        id={id}
        label={t('form.name')}
        hint={t('form.nameHint')}
        value={value}
        maxLength={60}
        onChange={(event) => onChange(event.target.value)}
        errorMessage={problem === null ? undefined : t(`failures.name.${problem.problem}`)}
      />
      <p aria-live="polite" className="m-0 min-h-5 text-[13px] text-body">
        {check.state === 'checking' && t('form.nameChecking')}
        {check.state === 'available' && t('form.nameAvailable')}
      </p>
    </div>
  );
}
