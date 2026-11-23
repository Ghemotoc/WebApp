/**
 * BookshelfChoiceRow: one bookshelf in the "Add to a bookshelf" sheet (bundle CALM-4; handover
 * Step 2, Bookshelves).
 *
 * What it shows: the bookshelf's name, "7 of 10" under it, and at the end a + that puts the story
 * on it, or a tick that takes it off. A full bookshelf the story is not on says "10 of 10 · Full"
 * with a lock in place of the +, never in red, and can't be pressed. The button shows the choice
 * at once and goes back if the change doesn't save, so it never feels stuck while the answer
 * travels.
 * Who uses it: AddToReadingList. What it calls: the onChange it is given
 * (set_story_in_reading_list() through useReadingListActions).
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import type { StoryListChoice } from '../api/readingLists';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** What a row needs. */
export interface BookshelfChoiceRowProps {
  choice: StoryListChoice;
  /** How many books one bookshelf holds (reading_list_stories_max). */
  places: number;
  /** Saves the change; rejects when it didn't save (the sheet says why). */
  onChange: (listId: string, isIn: boolean) => Promise<void>;
}

/** The round 44 px button at the end of the row. */
const buttonClasses =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-control-border text-ink-heading hover:bg-tint aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:border-dashed-border aria-disabled:text-ink-muted aria-disabled:hover:bg-transparent';

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function BookshelfChoiceRow({ choice, places, onChange }: BookshelfChoiceRowProps) {
  const { t } = useLibraryTranslation();
  // What the reader just chose, until the saved value arrives (null: show the saved value).
  const [chosen, setChosen] = useState<boolean | null>(null);
  const isOn = chosen ?? choice.hasStory;
  // A full bookshelf takes no new book; one already on it can still come off.
  const isFull = choice.bookCount >= places;
  const isLocked = isFull && !isOn;
  const count = { filled: choice.bookCount, count: places };

  /** Shows the choice, saves it, and goes back to the saved value either way. */
  function toggle() {
    if (isLocked) return;
    setChosen(!isOn);
    onChange(choice.id, !isOn)
      .catch(() => undefined)
      .finally(() => setChosen(null));
  }

  let label = t('lists.add.addLabel', { name: choice.name });
  if (isOn) label = t('lists.add.removeLabel', { name: choice.name });
  if (isLocked) label = t('lists.add.fullLabel', { name: choice.name });
  let icon: 'plus' | 'check' | 'lock' = 'plus';
  if (isOn) icon = 'check';
  if (isLocked) icon = 'lock';

  return (
    <li className="flex min-h-11 items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        {/* "anywhere" lets a name that is one long word wrap inside a phone's width (GAPS-6). */}
        <span className="type-label [overflow-wrap:anywhere] text-ink-heading">{choice.name}</span>
        <span className="type-meta">
          {isFull ? t('lists.add.rowFull', count) : t('lists.add.rowCount', count)}
        </span>
      </span>
      <button
        type="button"
        className={buttonClasses}
        aria-label={label}
        aria-pressed={isLocked ? undefined : isOn}
        aria-disabled={isLocked ? 'true' : undefined}
        onClick={toggle}
      >
        <ActionIcon name={icon} size={18} />
      </button>
    </li>
  );
}
