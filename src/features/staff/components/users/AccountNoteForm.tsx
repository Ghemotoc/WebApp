/**
 * AccountNoteForm: the "Add a note" form in the account page's Staff notes section (bundle
 * LOGS-1, part a; Robert, 6 Nov 2026: "a place for them to leave comments").
 *
 * Who shows it: AccountNotes. What it calls: the addNote action from hooks/useAccountNotes.ts.
 * The field empties only once the note is saved, so nothing typed is lost when saving fails.
 * The hint reminds staff that notes stay for good and that the person may one day see them in a
 * data request (GDPR art. 15), so they write facts, not opinions.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { accountNoteMaximumLength, type AccountNotesFailure } from '../../api/accountNotes';

/** What the form needs from the section. */
interface AccountNoteFormProps {
  addNote: (body: string, onAdded: () => void) => void;
  isAdding: boolean;
  addFailure: AccountNotesFailure | null;
}

/**
 * Renders the field, the hint, the Add button and any failure.
 *
 * @returns the form
 */
export function AccountNoteForm({ addNote, isAdding, addFailure }: AccountNoteFormProps) {
  const { t } = useTranslation('staff');
  const [body, setBody] = useState('');

  /** Sends the note; an empty one never leaves the page. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim() === '') return;
    addNote(body, () => setBody(''));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        id="account-note-body"
        label={t('users.notes.fieldLabel')}
        hint={t('users.notes.fieldHint', { count: accountNoteMaximumLength })}
        maxLength={accountNoteMaximumLength}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      {addFailure !== null && (
        <Notice tone="error">{t(`users.notes.failures.${addFailure}`)}</Notice>
      )}
      <Button type="submit" className="self-start" disabled={isAdding || body.trim() === ''}>
        {isAdding ? t('users.notes.adding') : t('users.notes.add')}
      </Button>
    </form>
  );
}
