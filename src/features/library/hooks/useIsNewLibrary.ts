/**
 * useIsNewLibrary: says whether the reader's Library is still empty, so the page can show the
 * short version drawn for a new reader (board C08; Robert, 25 Nov 2026, 09:50 UTC: no widget
 * missing between the canvas and the live site).
 *
 * Who calls it: LibraryPage. What it calls: useReadingLists and useMyFollows (the same reads the
 * bookshelves card and the Following section make, so TanStack Query shares them and nothing is
 * read twice).
 */
import type { LibraryOverview } from '../api/library';
import { libraryShelves } from '../api/library';

import { useMyFollows } from './useLibraryOverview';
import { useReadingLists } from './useReadingLists';

/**
 * Works out whether the reader has nothing in their Library yet: no story on any shelf, nothing
 * to continue, no bookshelf and nobody or nothing followed.
 *
 * A failed read of the bookshelves or the follows counts as "not new", so the full page shows
 * and each section says in its own words that it could not load.
 *
 * @param overview - the Library's first answer, or null while it loads
 * @returns null while any read is still loading, true for an empty Library, false otherwise
 */
export function useIsNewLibrary(overview: LibraryOverview | null): boolean | null {
  const { lists, loadFailed: listsFailed } = useReadingLists();
  const { follows, loadFailed: followsFailed } = useMyFollows();
  // Step 1: a failed read shows the full page, where the section explains the failure.
  if (listsFailed || followsFailed) return false;
  // Step 2: wait until all three reads have answered.
  if (overview === null || lists === null || follows === null) return null;
  // Step 3: empty only when every part of the Library is empty.
  const hasShelvedStory = libraryShelves.some((shelf) => overview.counts[shelf] > 0);
  const followsSomething = follows.writers.length > 0 || follows.stories.length > 0;
  return (
    !hasShelvedStory &&
    overview.continueReading.length === 0 &&
    lists.length === 0 &&
    !followsSomething
  );
}
