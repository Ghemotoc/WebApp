/**
 * AddToReadingList: "Add to a list" on the story page: the reader's reading lists as checkboxes,
 * and a way to make a new list with the story already in it (bundle GAPS-6).
 *
 * The button opens a small panel under itself (aria-expanded says so). Each list is a checkbox
 * that saves at once: ticked puts the story in, cleared takes it out. "New list" swaps the
 * checkboxes for the name form; the new list gets the story as soon as it exists. Nothing is read
 * until the panel opens, so the story page loads nothing extra.
 * Who uses it: StoryReadingActions, for a signed-in reader who isn't the story's writer.
 * What it calls: useStoryListChoices → story_reading_lists(); useReadingListActions →
 * set_story_in_reading_list() and create_reading_list().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { readingListFailureKey, type StoryListChoice } from '../api/readingLists';
import { useReadingListActions, useStoryListChoices } from '../hooks/useReadingLists';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { NewReadingListForm } from './NewReadingListForm';

/**
 * One list as a checkbox, with who sees the list under its name. The tick shows at once and is
 * taken back if the change doesn't save, so the box never feels stuck while the answer travels.
 */
function ListCheckbox(props: {
  storySlug: string;
  choice: StoryListChoice;
  /** Saves the change; rejects when it didn't save (the panel says why). */
  onChange: (listId: string, isIn: boolean) => Promise<void>;
}) {
  const { t } = useLibraryTranslation();
  // What the reader just chose, until the saved value arrives (null: show the saved value).
  const [chosen, setChosen] = useState<boolean | null>(null);
  const id = `reading-list-choice-${props.storySlug}-${props.choice.id}`;

  /** Shows the choice, saves it, and goes back to the saved value either way. */
  function change(isIn: boolean) {
    setChosen(isIn);
    props
      .onChange(props.choice.id, isIn)
      .catch(() => undefined)
      .finally(() => setChosen(null));
  }

  return (
    <li className="flex min-h-11 items-start gap-3 py-1">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0"
        checked={chosen ?? props.choice.hasStory}
        onChange={(event) => change(event.target.checked)}
      />
      <label htmlFor={id} className="flex min-w-0 flex-col">
        <span className="font-semibold break-words text-heading">{props.choice.name}</span>
        <span className="text-[13px] text-meta">
          {t(props.choice.isPublic ? 'lists.seenBy.public' : 'lists.seenBy.onlyYou')}
        </span>
      </label>
    </li>
  );
}

/** The open panel: the checkboxes with "New list", or the name form. */
function ListChoices({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const { choices, loadFailed } = useStoryListChoices(storySlug, true);
  const { setStoryInList, createList } = useReadingListActions();
  const [isNaming, setIsNaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (choices === null) return null;

  /** Puts the story in a list or takes it out; says why, and rejects, when it can't. */
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
          // A failure is already said under the checkboxes by change().
          change(listId, true).catch(() => undefined);
        }}
        onCancel={() => setIsNaming(false)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      {choices.length === 0 ? (
        <p className="m-0 text-sm text-body">{t('lists.add.none')}</p>
      ) : (
        <ul aria-label={t('lists.heading')} className="m-0 list-none p-0">
          {choices.map((choice) => (
            <ListCheckbox key={choice.id} storySlug={storySlug} choice={choice} onChange={change} />
          ))}
        </ul>
      )}
      <Button variant="text" className="self-start" onClick={() => setIsNaming(true)}>
        {t('lists.new.button')}
      </Button>
      <div aria-live="polite">
        {errorMessage !== null && <Notice tone="error">{errorMessage}</Notice>}
      </div>
    </div>
  );
}

/**
 * Renders the button and, once pressed, the panel.
 *
 * @param props.storySlug - the story's address
 * @returns the control
 */
export function AddToReadingList({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `add-to-list-${storySlug}`;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Button
        variant="secondary"
        className="self-start"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {t('lists.add.button')}
      </Button>
      <div id={panelId}>{isOpen && <ListChoices storySlug={storySlug} />}</div>
    </div>
  );
}
