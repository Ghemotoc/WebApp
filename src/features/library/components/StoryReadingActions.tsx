/**
 * StoryReadingActions: the reading parts of the story page's one action row (story S1-E4-03;
 * redrawn to board B01 in bundle 2, user story 2.1).
 *
 * - StoryReadButton, the main button: "Start reading" for a new reader, "Continue" once they have
 *   a place in the story (the chapter to carry on with, the next one when they finished theirs),
 *   and "Read again" once the story is on their Finished shelf.
 * - StoryLibraryButton, a quiet button: "Add to library", or "In library" once the story is on a
 *   Library shelf. It opens the "Add to a bookshelf" sheet (AddToReadingList), which also holds
 *   the Library drop-down (Reading, Saved for later, Finished) until board C03 redraws it
 *   (bundle 3, user story 3.3). A change saves at once.
 * - StoryFinishedThanks: on a story on the Finished shelf, "Tell the writer you finished it"
 *   beside the main button (FinishedThanksButton, IDEAS-1c), which turns into "Sent" once it went.
 * The story's writer sees none of them (their own story never fills their library). A signed-out
 * visitor sees only the main button; StoryHeader says "Get in to follow, like or save".
 * Who uses it: StoryHeader. What it calls: useStoryLibraryState → story_library_state() and
 * set_library_shelf(), AddToReadingList and FinishedThanksButton.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import { libraryShelves, type LibraryShelf } from '../api/library';
import { useStoryLibraryState } from '../hooks/useStoryLibraryState';
import { AddToReadingList } from './AddToReadingList';
import { FinishedThanksButton } from './FinishedThanksButton';
import { continueAddress, continueChapterNumber } from '../lib/places';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** The value the drop-down uses for "not in your library". */
const notInLibrary = 'none';

/** The main button's look: the one filled button on the page, 44 px tall. */
const mainButtonClass =
  'inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline';

/** What the main button needs. */
export interface StoryReadButtonProps {
  storySlug: string;
  /** The first chapter readers can open, or null when there is none. */
  firstChapterCode: string | null;
}

/**
 * The main button: start, continue or read again (user story 2.1).
 *
 * @returns the link, or nothing while the story has no chapter to open
 */
export function StoryReadButton({ storySlug, firstChapterCode }: StoryReadButtonProps) {
  const { t } = useLibraryTranslation();
  const { state } = useStoryLibraryState(storySlug);
  const place = state?.place ?? null;
  const hasFinished = state?.shelf === 'finished';
  // Step 1: a new reader, or one who finished, starts from chapter 1.
  if (place === null || hasFinished) {
    if (firstChapterCode === null) return null;
    return (
      <Link to={`/s/${storySlug}/${firstChapterCode}`} className={mainButtonClass}>
        {hasFinished ? t('button.readAgain') : t('startReading')}
      </Link>
    );
  }
  // Step 2: anyone else carries on where they stopped; the name says which chapter.
  const number = continueChapterNumber(place);
  return (
    <Link
      to={continueAddress(storySlug, place)}
      aria-label={t('continueChapter', { number })}
      className={mainButtonClass}
    >
      {t('button.continueShort')}
    </Link>
  );
}

/**
 * The Library drop-down inside the sheet (Reading, Saved for later, Finished), with the note when
 * a change didn't save.
 *
 * @returns the drop-down
 */
function LibraryShelfChoice({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const library = useStoryLibraryState(storySlug);
  if (library.state === null) return null;
  const options = [
    { value: notInLibrary, label: t('button.none') },
    ...libraryShelves.map((shelf) => ({ value: shelf, label: t(`shelves.${shelf}`) })),
  ];
  const choose = (value: string) => {
    const shelf: LibraryShelf | null = libraryShelves.find((name) => name === value) ?? null;
    library.changeShelf(shelf);
  };
  return (
    <div className="flex flex-col gap-2">
      <Select
        id={`library-shelf-${storySlug}`}
        label={t('button.label')}
        isLabelVisible
        options={options}
        value={library.state.shelf ?? notInLibrary}
        onChange={choose}
      />
      {library.saveFailed && <Notice tone="error">{t('button.saveFailed')}</Notice>}
    </div>
  );
}

/**
 * "Add to library" or "In library": opens the bookshelf sheet, with the Library drop-down on top.
 *
 * @returns the button, or nothing signed out or while the state loads
 */
export function StoryLibraryButton({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const library = useStoryLibraryState(storySlug);
  if (!library.isSignedIn || library.state === null) return null;
  const isInLibrary = library.state.shelf !== null;
  return (
    <AddToReadingList
      storySlug={storySlug}
      buttonLabel={isInLibrary ? t('button.inLibrary') : t('button.addToLibrary')}
      isPressed={isInLibrary}
      sheetTop={<LibraryShelfChoice storySlug={storySlug} />}
    />
  );
}

/**
 * "Tell the writer you finished it", once the story is on the Finished shelf.
 *
 * @returns the button, or nothing
 */
export function StoryFinishedThanks({ storySlug }: { storySlug: string }) {
  const { state } = useStoryLibraryState(storySlug);
  if (state === null || state.shelf !== 'finished') return null;
  return <FinishedThanksButton storySlug={storySlug} isSent={state.thanksSent} />;
}
