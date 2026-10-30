/**
 * StoryReadingActions: "Start reading" or "Continue chapter 14", and the Library drop-down, on
 * the story page (story S1-E4-03; board 3.4 Story, the action row).
 *
 * - The main button opens the first chapter, or, once the reader has a place in the story, the
 *   chapter to carry on with (the next one when they finished theirs).
 * - "Library" puts the story on a shelf (Reading, Saved for later, Finished) or takes it off. It
 *   is a native drop-down in the shared style (DoD drop-downs), so it works by keyboard and
 *   screen reader with no extra code; the change saves at once.
 * The story's writer sees neither (their own story never fills their library). A signed-out
 * visitor sees "Start reading" and a "Log in to save it" link.
 * Who uses it: StoryHeader. What it calls: useStoryLibraryState → story_library_state() and
 * set_library_shelf().
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import { libraryShelves, type LibraryShelf } from '../api/library';
import { useStoryLibraryState } from '../hooks/useStoryLibraryState';
import { continueAddress, continueChapterNumber } from '../lib/places';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** What the row needs. */
export interface StoryReadingActionsProps {
  storySlug: string;
  /** The first chapter readers can open, or null when there is none. */
  firstChapterCode: string | null;
  isOwner: boolean;
}

/** The value the drop-down uses for "not in your library". */
const notInLibrary = 'none';

/** The main button: start or continue. */
function ReadButton(props: { storySlug: string; firstChapterCode: string | null }) {
  const { t } = useLibraryTranslation();
  const { state } = useStoryLibraryState(props.storySlug);
  const place = state?.place ?? null;
  if (place === null && props.firstChapterCode === null) return null;
  const address =
    place === null
      ? `/s/${props.storySlug}/${props.firstChapterCode}`
      : continueAddress(props.storySlug, place);
  const words =
    place === null
      ? t('startReading')
      : t('continueChapter', { number: continueChapterNumber(place) });
  return (
    <Link
      to={address}
      className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
    >
      {words}
    </Link>
  );
}

/** The Library drop-down, or the log-in link for a visitor. */
function LibraryChoice({ storySlug }: { storySlug: string }) {
  const { t } = useLibraryTranslation();
  const library = useStoryLibraryState(storySlug);
  if (!library.isSessionKnown) return null;
  if (!library.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        className="text-sm font-semibold text-link underline hover:text-link-hover"
      >
        {t('button.logIn')}
      </Link>
    );
  }
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
 * Renders the row.
 *
 * @returns the start or continue link and the Library drop-down, or nothing for the writer
 */
export function StoryReadingActions({
  storySlug,
  firstChapterCode,
  isOwner,
}: StoryReadingActionsProps) {
  if (isOwner) return null;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ReadButton storySlug={storySlug} firstChapterCode={firstChapterCode} />
      <LibraryChoice storySlug={storySlug} />
    </div>
  );
}
