/**
 * useRemoveFromBookshelf: the owner's Remove under each book on a bookshelf's page (bundle GAPS-6;
 * redrawn under each cover for board C02, Robert, 25 Nov 2026, 09:50 UTC).
 *
 * It takes the story out at once and offers "Undo" for 8 seconds instead of asking first (design
 * books item 14). Who calls it: BookshelfBooks. What it calls: useReadingListActions →
 * set_story_in_reading_list(), and useUndo for the Undo toast.
 */
import { useState } from 'react';

import { useUndo } from '@/lib/undo/useUndo';

import { useLibraryTranslation } from '../registerLibraryTranslations';

import { useReadingListActions } from './useReadingLists';

/**
 * Gives the Remove action for one bookshelf.
 *
 * @param listId - the owner's bookshelf
 * @returns remove(storySlug, title), and hasFailed for the plain error under the books
 */
export function useRemoveFromBookshelf(listId: string) {
  const { t } = useLibraryTranslation();
  const { setStoryInList } = useReadingListActions();
  const { offerUndo } = useUndo();
  const [hasFailed, setHasFailed] = useState(false);

  /** Takes one story off the bookshelf, then offers to put it back. */
  async function remove(storySlug: string, title: string) {
    // Step 1: take it off; a failure is said in plain words under the books.
    setHasFailed(false);
    try {
      await setStoryInList({ listId, storySlug, isIn: false });
    } catch {
      setHasFailed(true);
      return;
    }
    // Step 2: Undo puts the same story back on the same bookshelf.
    offerUndo({
      message: t('lists.page.removedUndo', { title }),
      undo: () => setStoryInList({ listId, storySlug, isIn: true }).then(() => undefined),
    });
  }

  return { remove, hasFailed };
}
