/**
 * NewReadingListForm: the small form that names a new reading list (bundle GAPS-6; board
 * Library, "New list").
 *
 * One field and two buttons. The name is checked by the database (one line, 1 to 60 characters,
 * no HTML, not a name the reader already uses); a refusal is said under the field in plain words.
 * Who uses it: ReadingListsCard (the Library) and AddToReadingList (the story page).
 * What it calls: the onCreate it is given (useReadingListActions().createList).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import { readingListFailureKey, readingListNameMax } from '../api/readingLists';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** What the form needs. */
export interface NewReadingListFormProps {
  /** Unique on the page: the field's id starts with it. */
  idPrefix: string;
  /** Makes the list; resolves to its ID, or throws with the reason. */
  onCreate: (name: string) => Promise<string>;
  /** Called with the new list's ID once it exists. */
  onCreated: (listId: string) => void;
  onCancel: () => void;
}

/**
 * Renders the form.
 *
 * @returns the name field with Create and Cancel
 */
export function NewReadingListForm(props: NewReadingListFormProps) {
  const { t } = useLibraryTranslation();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const form = useRef<HTMLFormElement>(null);

  // The reader asked for this form with a button, so the name field takes the focus when it
  // appears: a keyboard or screen reader user lands in it instead of hunting for it.
  useEffect(() => {
    form.current?.querySelector('input')?.focus();
  }, []);

  /** Sends the name; the form stays open with the reason when the database refuses it. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    // A second press while the first is on its way would make the same list twice.
    if (isSaving) return;
    if (name.trim() === '') {
      setErrorMessage(t('lists.errors.nameLength'));
      return;
    }
    setIsSaving(true);
    setErrorMessage(undefined);
    try {
      props.onCreated(await props.onCreate(name));
    } catch (error) {
      setErrorMessage(t(readingListFailureKey(error)));
      setIsSaving(false);
    }
  }

  return (
    <form
      ref={form}
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <TextInput
        id={`${props.idPrefix}-name`}
        label={t('lists.new.nameLabel')}
        hint={t('lists.new.nameHint')}
        value={name}
        maxLength={readingListNameMax}
        onChange={(event) => setName(event.target.value)}
        errorMessage={errorMessage}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" isLoading={isSaving}>
          {t('lists.new.create')}
        </Button>
        <Button variant="secondary" onClick={props.onCancel}>
          {t('lists.new.cancel')}
        </Button>
      </div>
    </form>
  );
}
