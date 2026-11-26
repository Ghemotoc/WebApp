/**
 * ReadingListOwnerTools: the owner's actions on a bookshelf's page, one row under the name as
 * drawn on board C02: "Find stories", "Rename", who sees it and "Delete bookshelf" (bundle GAPS-6
 * built them as a "Manage bookshelf" card; redrawn as the row for Robert, 25 Nov 2026, 09:50 UTC:
 * no widget missing between the canvas and the live site).
 *
 * - Find stories: a quiet button to Discover, where "Add to a bookshelf" fills the places.
 * - Rename: opens the name field with Save under the row; the database's refusal (a name already
 *   used, HTML, too long) is said under the field.
 * - Who sees it: a drop-down in the shared style, "Only you" or "Anyone with the link"; it saves
 *   at once. The board leaves it out, because it draws the rule that bookshelves are private
 *   under 18 and public from 18 unless the member goes premium; that rule needs the member's age
 *   band and a premium plan, which aren't built, so the choice stays (docs/board-fixes.md).
 * - Delete bookshelf asks once more (TwoStepDelete), then returns to the Library.
 * Removing a story is under each book (BookshelfBooks).
 * Who uses it: ReadingListPage. What it calls: useReadingListActions → update_reading_list() and
 * delete_reading_list().
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { TwoStepDelete } from '@/features/atlas/components/TwoStepDelete';

import {
  readingListFailureKey,
  readingListNameMax,
  type ReadingListDetails,
} from '../api/readingLists';
import { useReadingListActions } from '../hooks/useReadingLists';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** The name field with Save, shown once "Rename" is pressed. */
function RenameForm({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  const { changeList } = useReadingListActions();
  const [name, setName] = useState(list.name);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);

  /** Saves the new name, or says why it can't be used. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setIsSaved(false);
    setErrorMessage(undefined);
    try {
      await changeList(list.id, { name });
      setIsSaved(true);
    } catch (error) {
      setErrorMessage(t(readingListFailureKey(error)));
    }
    setIsSaving(false);
  }

  return (
    <form
      id="reading-list-rename"
      onSubmit={(event) => void submit(event)}
      className="flex max-w-xl flex-col gap-3"
    >
      <TextInput
        id="reading-list-name"
        label={t('lists.page.nameLabel')}
        value={name}
        maxLength={readingListNameMax}
        onChange={(event) => setName(event.target.value)}
        errorMessage={errorMessage}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" isLoading={isSaving}>
          {t('lists.page.saveName')}
        </Button>
        <span aria-live="polite" className="type-body text-ink-muted">
          {isSaved ? t('lists.page.saved') : ''}
        </span>
      </div>
    </form>
  );
}

/** "Who sees it": Only you, or Anyone with the link. The hint is the note under the books. */
function AudienceChoice({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  const { changeList } = useReadingListActions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const options = [
    { value: 'private', label: t('lists.seenBy.onlyYou') },
    { value: 'public', label: t('lists.seenBy.public') },
  ];

  /** Saves the choice at once; the drop-down shows the saved value again if it fails. */
  function choose(value: string) {
    setErrorMessage(null);
    changeList(list.id, { isPublic: value === 'public' }).catch((error: unknown) =>
      setErrorMessage(t(readingListFailureKey(error))),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        id="reading-list-audience"
        label={t('lists.page.audienceLabel')}
        isLabelVisible
        placement="form"
        options={options}
        value={list.isPublic ? 'public' : 'private'}
        onChange={choose}
        descriptionId="reading-list-audience-hint"
      />
      <div aria-live="polite">
        {errorMessage !== null && <Notice tone="error">{errorMessage}</Notice>}
      </div>
    </div>
  );
}

/**
 * Renders the owner's row of actions, and the name field once Rename is pressed.
 *
 * @param props.list - the reader's own bookshelf
 * @returns the row
 */
export function ReadingListOwnerTools({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  const navigate = useNavigate();
  const { deleteList } = useReadingListActions();
  const [isRenaming, setIsRenaming] = useState(false);

  /** Deletes the bookshelf, then goes back to the Library, where it is gone from the rows. */
  async function deleteThenLeave(): Promise<null> {
    await deleteList(list.id);
    void navigate('/library');
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Link
          to="/discover"
          className="inline-flex h-11 items-center rounded-full button-glass px-4 type-body font-semibold no-underline"
        >
          {t('lists.page.discover')}
        </Link>
        <Button
          variant="text"
          aria-expanded={isRenaming}
          aria-controls={isRenaming ? 'reading-list-rename' : undefined}
          onClick={() => setIsRenaming((open) => !open)}
        >
          {t('lists.page.rename')}
        </Button>
        <AudienceChoice list={list} />
        <TwoStepDelete
          buttonLabel={t('lists.page.delete')}
          buttonVariant="text"
          question={t('lists.page.deleteQuestion', { name: list.name })}
          yesLabel={t('lists.page.deleteYes')}
          keepLabel={t('lists.page.deleteKeep')}
          failedMessage={t('lists.errors.saveFailed')}
          onDelete={deleteThenLeave}
        />
      </div>
      {isRenaming && <RenameForm list={list} />}
    </div>
  );
}
