/**
 * useIsNewLibrary: says whether the reader's Library is still empty, so the page can show the
 * short version drawn for a new reader (board C08; Robert, 25 Nov 2026, 09:50 UTC: no widget
 * missing between the canvas and the live site).
 *
 * Who calls it: LibraryPage. What it calls: useReadingLists, useMyFollows and useMyStories (the
 * same reads the bookshelves card, the Following section and "Written by you" make, so TanStack
 * Query shares them and nothing is read twice).
 */
import type { LibraryOverview } from '../api/library';
import { libraryShelves } from '../api/library';
import { liveOwnStories } from '../lib/ownStories';

import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { useMyFollows } from './useLibraryOverview';
import { useReadingLists } from './useReadingLists';

/** What the Library has once every read has answered. */
interface LibraryContents {
  overview: LibraryOverview;
  bookshelfCount: number;
  followsSomething: boolean;
  ownStoryCount: number;
}

/**
 * Says whether every part of the Library is empty: no story on any shelf, nothing to continue,
 * no bookshelf, nobody or nothing followed and no story of the reader's own.
 *
 * @returns true for an empty Library
 */
function isLibraryEmpty(contents: LibraryContents): boolean {
  const hasShelvedStory = libraryShelves.some((shelf) => contents.overview.counts[shelf] > 0);
  return (
    !hasShelvedStory &&
    contents.overview.continueReading.length === 0 &&
    contents.bookshelfCount === 0 &&
    !contents.followsSomething &&
    contents.ownStoryCount === 0
  );
}

/**
 * Works out whether the reader has nothing in their Library yet. A writer who has written but
 * not read yet still sees "Written by you" (NAV-1), so their own stories make the Library not new.
 *
 * A failed read of the bookshelves, the follows or the writer's stories counts as "not new", so
 * the full page shows and each section says in its own words that it could not load.
 *
 * @param overview - the Library's first answer, or null while it loads
 * @returns null while any read is still loading, true for an empty Library, false otherwise
 */
export function useIsNewLibrary(overview: LibraryOverview | null): boolean | null {
  const { lists, loadFailed: listsFailed } = useReadingLists();
  const { follows, loadFailed: followsFailed } = useMyFollows();
  const { stories, isKnown: ownStoriesKnown, loadFailed: ownStoriesFailed } = useMyStories();
  // Step 1: a failed read shows the full page, where the section explains the failure.
  if (listsFailed || followsFailed || ownStoriesFailed) return false;
  // Step 2: wait until all four reads have answered.
  if (overview === null || lists === null || follows === null || !ownStoriesKnown) return null;
  // Step 3: new only when every part of the Library, the writer's own stories included, is empty.
  return isLibraryEmpty({
    overview,
    bookshelfCount: lists.length,
    followsSomething: follows.writers.length > 0 || follows.stories.length > 0,
    ownStoryCount: liveOwnStories(stories).length,
  });
}
