/**
 * AddToReadingList: "Add to a bookshelf" on the story page: a sheet with a row for each of the
 * reader's bookshelves and a way to make a new one with the story already on it (bundle GAPS-6;
 * redrawn as a sheet in bundle CALM-4).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026; handover Step 2, Bookshelves and Sheets):
 *   - One row per bookshelf, split by hairlines: its name, "7 of 10" and a + (or a tick when the
 *     story is on it) that saves at once.
 *   - A full bookshelf says "10 of 10 · Full" with a lock, never in red; the story can still come
 *     off one it is on.
 *   - "New bookshelf" is the last row; the free plan's limit is written once, at the bottom.
 * Nothing is read until the sheet opens, so the story page loads nothing extra.
 * Who uses it: StoryReadingActions, for a signed-in reader who isn't the story's writer.
 * What it calls: Sheet; useStoryListChoices → story_reading_lists(); useReadingListActions →
 * set_story_in_reading_list() and create_reading_list(); useBookshelfLimits for the limits.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Sheet } from '@/components/ui/Sheet';

import { readingListFailureKey, type StoryListChoice } from '../api/readingLists';
import { useBookshelfLimits } from '../hooks/useBookshelfLimits';
import { useReadingListActions, useStoryListChoices } from '../hooks/useReadingLists';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { BookshelfChoiceRow } from './BookshelfChoiceRow';
import { NewReadingListForm } from './NewReadingListForm';

/** The rows, "New bookshelf" and the line with the limits. */
function BookshelfRows(props: {
  choices: StoryListChoice[];
  onChange: (listId: string, isIn: boolean) => Promise<void>;
  onNew: () => void;
}) {
  const { t } = useLibraryTranslation();
  const limits = useBookshelfLimits();
  return (
    <>
      <ul aria-label={t('lists.heading')} className="m-0 list-none divide-y divide-border p-0">
        {props.choices.map((choice) => (
          <BookshelfChoiceRow
            key={choice.id}
            choice={choice}
            places={limits.books}
            onChange={props.onChange}
          />
        ))}
        {/* "New bookshelf" is always the last row (handover Step 2). */}
        <li className="py-2">
          <Button variant="text" onClick={props.onNew}>
            <ActionIcon name="plus" size={16} />
            {t('lists.new.button')}
          </Button>
        </li>
      </ul>
      {props.choices.length === 0 && <p className="m-0 text-sm text-body">{t('lists.add.none')}</p>}
      <p className="m-0 type-meta">
        {t('lists.add.limitNote', { shelves: limits.shelves, books: limits.books })}
      </p>
    </>
  );
}

/** The open sheet's content: the rows, or the name form for a new bookshelf. */
function ListChoices({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const { choices, loadFailed } = useStoryListChoices(storySlug, true);
  const { setStoryInList, createList } = useReadingListActions();
  const [isNaming, setIsNaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (choices === null) return null;

  /** Puts the story on a bookshelf or takes it off; says why, and rejects, when it can't. */
  async function change(listId: string, isIn: boolean): Promise<void> {
    setErrorMessage(null);
    try {
      await setStoryInList({ listId, storySlug, isIn });
    } catch (error) {
      setErrorMessage(t(readingListFailureKey(error)));
      throw error;
    }
  }

  if (isNaming) {
    return (
      <NewReadingListForm
        idPrefix={`story-new-list-${storySlug}`}
        onCreate={createList}
        onCreated={(listId) => {
          setIsNaming(false);
          // A failure is already said under the rows by change().
          change(listId, true).catch(() => undefined);
        }}
        onCancel={() => setIsNaming(false)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <BookshelfRows choices={choices} onChange={change} onNew={() => setIsNaming(true)} />
      <div aria-live="polite">
        {errorMessage !== null && <Notice tone="error">{errorMessage}</Notice>}
      </div>
    </div>
  );
}

/**
 * Renders the button and, once pressed, the sheet.
 *
 * @param props.storySlug - the story's address
 * @returns the control
 */
export function AddToReadingList({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Button
        variant="secondary"
        className="self-start"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        {t('lists.add.button')}
      </Button>
      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('lists.add.button')}>
        {isOpen && <ListChoices storySlug={storySlug} />}
      </Sheet>
    </div>
  );
}
