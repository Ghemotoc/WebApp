/**
 * SpaceNameField: the space's name, checked as the owner types: "This name is available." or
 * why not (bundle FORUMS-2, part a; S1-E8-06 criterion 2: "each name can only be used once").
 *
 * The check waits for a pause in typing, and the database checks again when the form is sent.
 * The answer sits in a polite live region, so a screen reader hears it without moving focus.
 * Who uses it: SpaceForm and NewClassSpaceForm (board G07 names it "Class name" with its own
 * hint, and says so when it is empty). What it calls: useSpaceNameCheck → space_name_available().
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
  /** The field's id, so a form can move focus to it; a fresh one when left out. */
  fieldId?: string;
  /** The label and hint, when not a space's own "Name" (a class's "Class name", BOOKS-8b). */
  label?: string;
  hint?: string;
  /** "Give the class a name." after the form was sent empty, else undefined. */
  missingMessage?: string;
}

/**
 * Renders the field and the check's answer.
 *
 * @returns the text field with its hint, error and live answer
 */
export function SpaceNameField(props: SpaceNameFieldProps) {
  const { value, onChange, ownName, sentProblem } = props;
  const { t } = useSpacesTranslation();
  const freshId = useId();
  const id = props.fieldId ?? freshId;
  const check = useSpaceNameCheck(value, ownName);
  const problem = check.problem ?? sentProblem;
  // An empty name after sending says so; otherwise the name check's answer, if any.
  const problemText = problem === null ? undefined : t(`failures.name.${problem.problem}`);
  return (
    <div className="flex flex-col gap-2">
      <TextInput
        id={id}
        label={props.label ?? t('form.name')}
        hint={props.hint ?? t('form.nameHint')}
        value={value}
        maxLength={60}
        onChange={(event) => onChange(event.target.value)}
        errorMessage={props.missingMessage ?? problemText}
      />
      <p aria-live="polite" className="m-0 min-h-5 type-meta text-ink-muted">
        {check.state === 'checking' && t('form.nameChecking')}
        {check.state === 'available' && t('form.nameAvailable')}
      </p>
    </div>
  );
}
