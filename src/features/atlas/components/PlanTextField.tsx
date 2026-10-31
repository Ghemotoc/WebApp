/**
 * PlanTextField: a Story Atlas text box that saves by itself (Story Atlas principle: "Every change
 * saves by itself. There is no Save button to forget"; stories S1-E17-03 and S1-E17-04).
 *
 * One line, or several (`isMultiline`) that grow with the text (S1-E17-09's rule, used here for
 * the logline). The note under it says Saving, Saved, or a plain message (SaveNote).
 * Who uses it: StoryDetailsSection and LinkedProjectSection. What it calls: useAutosaveField with
 * the save function it is given.
 */
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';

import { useAutosaveField } from '../hooks/useAutosaveField';

import { SaveNote } from './SaveNote';

/** What the field needs. */
export interface PlanTextFieldProps {
  id: string;
  label: string;
  hint?: string;
  /** The saved value. */
  savedValue: string;
  /** Saves a new value; throws when it can't. */
  save: (value: string) => Promise<void>;
  /** A rule the value must follow before it is sent (the linked project's address). */
  isValid?: (value: string) => boolean;
  invalidMessage?: string;
  isMultiline?: boolean;
  maxLength?: number;
  /** 'url' for a web address, so phones offer the right keyboard. */
  type?: 'text' | 'url';
}

/**
 * Renders the field and its save note.
 *
 * @returns the label, the box and the note
 */
export function PlanTextField({
  id,
  label,
  hint,
  savedValue,
  save,
  isValid,
  invalidMessage,
  isMultiline = false,
  maxLength,
  type = 'text',
}: PlanTextFieldProps) {
  const field = useAutosaveField({ savedValue, save, isValid });
  const noteId = `${id}-save`;
  // The box points at its hint (when there is one) and at the save note.
  const describedBy = hint === undefined ? noteId : `${id}-hint ${noteId}`;
  const shared = {
    id,
    label,
    hint,
    value: field.value,
    maxLength,
    'aria-describedby': describedBy,
    onBlur: () => void field.flush(),
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {isMultiline ? (
        <Textarea
          {...shared}
          rows={3}
          className="[field-sizing:content] min-h-24"
          onChange={(event) => field.change(event.target.value)}
        />
      ) : (
        <TextInput {...shared} type={type} onChange={(event) => field.change(event.target.value)} />
      )}
      <SaveNote id={noteId} status={field.status} invalidMessage={invalidMessage} />
    </div>
  );
}
