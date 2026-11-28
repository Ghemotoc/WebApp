/**
 * PlayCastForm: adding or changing one character of a play's cast, inside the Characters panel
 * (LAYOUTS-2; board D14, the panel's "Add").
 *
 * A name (1 to 40 characters) and a short note (up to 80, optional), then Save and Cancel, and
 * Remove for a character already on the list. Save stays pressable: pressed with the name empty
 * it says so beside the field and puts the focus there (design books item 9, useMissingField).
 * A name already on the list is refused beside the field before anything is sent.
 * Who uses it: PlayCastPanel. What it calls: TextInput, Button, ButtonRow and useMissingField.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { TextInput } from '@/components/ui/TextInput';
import { useMissingField } from '@/lib/forms/useMissingField';
import {
  MAXIMUM_CAST_NAME_LENGTH,
  MAXIMUM_CAST_NOTE_LENGTH,
  type CastMember,
} from '@/schemas/playCast';

import { useEditorTranslation } from '../registerEditorTranslations';

/** What the form needs. */
export interface PlayCastFormProps {
  /** The character being changed, or null for a new one. */
  member: CastMember | null;
  /** The other characters' names, so the same name isn't added twice. */
  otherNames: string[];
  onSave: (member: CastMember) => void;
  onCancel: () => void;
  /** Takes the character off the list; only for one already on it. */
  onRemove?: () => void;
}

/** The form's fields, what is wrong with the name, and the submit that checks it first. */
function useCastForm(props: PlayCastFormProps) {
  const { t } = useEditorTranslation();
  const [name, setName] = useState(props.member?.name ?? '');
  const [note, setNote] = useState(props.member?.note ?? '');
  const [isDuplicate, setDuplicate] = useState(false);
  const missingName = useMissingField(name.trim() === '', 'play-cast-name');

  /** Step 1: a name is needed; step 2: not one already on the list; step 3: save it. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!missingName.isReadyToSend()) return;
    const trimmed = name.trim();
    if (props.otherNames.some((other) => other.toLowerCase() === trimmed.toLowerCase())) {
      setDuplicate(true);
      return;
    }
    props.onSave({ name: trimmed, note: note.trim() });
  }

  /** The message beside the name, if one is due. */
  function nameProblem(): string | undefined {
    if (missingName.isShown) return t('play.cast.missingName');
    if (isDuplicate) return t('play.cast.problems.duplicate_name');
    return undefined;
  }

  /** A change of the name clears the "already on the list" message. */
  function changeName(value: string) {
    setName(value);
    setDuplicate(false);
  }

  return { name, changeName, note, setNote, submit, nameProblem };
}

/**
 * Renders the form.
 *
 * @returns the name and note fields with Save, Cancel and (for a known character) Remove
 */
export function PlayCastForm(props: PlayCastFormProps) {
  const { member, onCancel, onRemove } = props;
  const { t } = useEditorTranslation();
  const { name, changeName, note, setNote, submit, nameProblem } = useCastForm(props);
  const heading =
    member === null
      ? t('play.cast.newHeading')
      : t('play.cast.changeHeading', { name: member.name });
  return (
    <form
      onSubmit={submit}
      aria-label={heading}
      className="flex flex-col gap-3 border-t border-hairline pt-3"
    >
      <TextInput
        id="play-cast-name"
        label={t('play.cast.name')}
        value={name}
        maxLength={MAXIMUM_CAST_NAME_LENGTH}
        autoComplete="off"
        errorMessage={nameProblem()}
        onChange={(event) => changeName(event.target.value)}
      />
      <TextInput
        id="play-cast-note"
        label={t('play.cast.note')}
        hint={t('play.cast.noteHint')}
        value={note}
        maxLength={MAXIMUM_CAST_NOTE_LENGTH}
        autoComplete="off"
        onChange={(event) => setNote(event.target.value)}
      />
      <ButtonRow>
        <Button type="submit">{t('play.cast.save')}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('play.cast.cancel')}
        </Button>
        {onRemove !== undefined && (
          <Button type="button" variant="text" onClick={onRemove}>
            {t('play.cast.remove')}
          </Button>
        )}
      </ButtonRow>
    </form>
  );
}
