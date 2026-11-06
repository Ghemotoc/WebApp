/**
 * SpaceJoinRequestForm: "Join space" for a space that approves each request, with an optional
 * short note saying why (bundle 14d IDEAS-3, part d; idea IDEA-20261102-9, criterion 1).
 *
 * Who shows it: SpaceJoinActions, for someone who may join a space whose owner approves requests.
 * "Join space" opens the note field with "Send request" and "Cancel"; the note may stay empty. The
 * database keeps it to 200 characters and refuses HTML; a refusal shows under the buttons in
 * SpaceJoinActions, from the same membership change.
 * What it calls: the membership change it is given (useMembership → join_space(slug, note)).
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

import type { useMembership } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The longest note, in characters (the setting space_join_note_max_characters). */
const joinNoteMaxCharacters = 200;

/**
 * Renders "Join space", then the note field and its buttons.
 *
 * @param props.membership - the space's membership change
 * @returns the button, or the small form
 */
export function SpaceJoinRequestForm({
  membership,
}: {
  membership: ReturnType<typeof useMembership>;
}) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // Opening the form moves the keyboard to the note, so "Join space" leads straight on to it.
  useEffect(() => {
    if (isOpen) fieldRef.current?.focus();
  }, [isOpen]);

  /** Sends the request with the note; a refusal keeps the form open with the words. */
  async function send(event: FormEvent) {
    event.preventDefault();
    await membership.join(note).catch(errorShownByHook);
  }

  if (!isOpen) {
    return <Button onClick={() => setIsOpen(true)}>{t('join.join')}</Button>;
  }
  return (
    <form className="flex w-full max-w-[360px] flex-col gap-3" onSubmit={send}>
      <Textarea
        id={fieldId}
        label={t('joinNote.label')}
        hint={t('joinNote.hint', { count: note.trim().length, limit: joinNoteMaxCharacters })}
        value={note}
        ref={fieldRef}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button
          variant="secondary"
          disabled={membership.isRunning}
          onClick={() => setIsOpen(false)}
        >
          {t('joinNote.cancel')}
        </Button>
        <Button type="submit" disabled={membership.isRunning}>
          {t('joinNote.send')}
        </Button>
      </div>
    </form>
  );
}
