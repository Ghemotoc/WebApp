/**
 * ReadingListOwnerTools: what only a reading list's owner sees on its page: rename it, choose who
 * sees it, take stories out and delete it (bundle GAPS-6).
 *
 * - Rename: the name in a field with Save; the database's refusal (a name already used, HTML, too
 *   long) is said under the field.
 * - "Who sees it": a drop-down in the shared style, "Only you" or "Anyone with the link"; it
 *   saves at once. A public list can be reported by whoever opens it.
 * - Each story has a "Remove" button named after the story.
 * - "Delete list" asks once more (TwoStepDelete), then returns to the Library.
 * Who uses it: ReadingListPage. What it calls: useReadingListActions → update_reading_list(),
 * set_story_in_reading_list() and delete_reading_list().
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

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

/** The name field with Save. */
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
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
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
        <span aria-live="polite" className="text-sm text-meta">
          {isSaved ? t('lists.page.saved') : ''}
        </span>
      </div>
    </form>
  );
}

/** "Who sees it": Only you, or Anyone with the link. */
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
      <p id="reading-list-audience-hint" className="m-0 text-sm text-meta">
        {t('lists.page.audienceHint')}
      </p>
      <div aria-live="polite">
        {errorMessage !== null && <Notice tone="error">{errorMessage}</Notice>}
      </div>
    </div>
  );
}

/** The list's stories, each with its Remove button. */
function EntryRows({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  const { setStoryInList } = useReadingListActions();
  const [hasFailed, setHasFailed] = useState(false);
  if (list.entries.length === 0) return null;

  /** Takes one story out of the list. */
  function remove(storySlug: string) {
    setHasFailed(false);
    setStoryInList({ listId: list.id, storySlug, isIn: false }).catch(() => setHasFailed(true));
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('lists.page.entriesHeading')}
      </h3>
      <ul className="m-0 list-none p-0">
        {list.entries.map((entry) => (
          <li
            key={entry.slug}
            className="flex items-center justify-between gap-3 border-t border-border py-2 first:border-t-0"
          >
            <span className="min-w-0 break-words text-heading">{entry.title}</span>
            <Button
              variant="text"
              className="shrink-0"
              aria-label={t('lists.page.removeLabel', { title: entry.title })}
              onClick={() => remove(entry.slug)}
            >
              {t('lists.page.remove')}
            </Button>
          </li>
        ))}
      </ul>
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('lists.errors.saveFailed')}</Notice>}
      </div>
    </div>
  );
}

/**
 * Renders the owner's tools as one card.
 *
 * @param props.list - the reader's own list
 * @returns the card
 */
export function ReadingListOwnerTools({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  const navigate = useNavigate();
  const { deleteList } = useReadingListActions();

  /** Deletes the list, then goes back to the Library, where it is gone from the rows. */
  async function deleteThenLeave(): Promise<null> {
    await deleteList(list.id);
    void navigate('/library');
    return null;
  }

  return (
    <section
      aria-labelledby="reading-list-tools-heading"
      className="flex flex-col gap-6 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h2
        id="reading-list-tools-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('lists.page.toolsHeading')}
      </h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RenameForm list={list} />
        <AudienceChoice list={list} />
      </div>
      <EntryRows list={list} />
      <TwoStepDelete
        buttonLabel={t('lists.page.delete')}
        question={t('lists.page.deleteQuestion', { name: list.name })}
        yesLabel={t('lists.page.deleteYes')}
        keepLabel={t('lists.page.deleteKeep')}
        failedMessage={t('lists.errors.saveFailed')}
        onDelete={deleteThenLeave}
      />
    </section>
  );
}
