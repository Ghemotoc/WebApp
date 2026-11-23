/**
 * FeaturedLibraryButton: "Add to library" beside "Read the story" on the Read page's hero (bundle
 * CALM-7c; board New-Read).
 *
 * A quiet button for someone signed in. It puts the story on the Saved shelf (the same as choosing
 * "Saved for later" in the story page's Library drop-down), then reads "In library" as a link to
 * the Library, so a second press never takes a story off a shelf by accident. A story already on
 * any shelf shows "In library" at once. Only one slide shows at a time, so the words need no
 * title. A visitor sees nothing here: "Read the story" leads on, and the story page offers the
 * Library once they log in.
 * Who shows it: FeaturedSlide. What it calls: useStoryLibraryState → story_library_state() and
 * set_library_shelf().
 */
import { Link } from 'react-router';

import { useStoryLibraryState } from '@/features/library/hooks/useStoryLibraryState';

import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** The quiet button's look, shared by the button and the link it turns into. */
const quietButton =
  'inline-flex h-11 cursor-pointer items-center rounded-full button-glass px-4 font-semibold no-underline';

/**
 * Renders the button, the link, or nothing.
 *
 * @param props.storySlug - the featured story's address
 * @returns the control or null
 */
export function FeaturedLibraryButton({ storySlug }: { storySlug: string }) {
  const { t } = useDiscoveryTranslation();
  const library = useStoryLibraryState(storySlug);
  // Step 1: nothing for a visitor, or while the story's shelf loads.
  if (!library.isSignedIn || library.state === null) return null;
  // Step 2: already on a shelf: a link to the Library.
  if (library.state.shelf !== null) {
    return (
      <Link to="/library" className={quietButton}>
        {t('featured.inLibrary')}
      </Link>
    );
  }
  // Step 3: not yet: the button saves it for later; a failed save says so beside it.
  return (
    <>
      <button
        type="button"
        disabled={library.isSaving}
        onClick={() => library.changeShelf('saved')}
        className={quietButton}
      >
        {t('featured.addToLibrary')}
      </button>
      {library.saveFailed && (
        <span role="alert" className="type-meta text-destructive">
          {t('featured.addFailed')}
        </span>
      )}
    </>
  );
}
