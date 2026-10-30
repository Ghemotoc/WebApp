/**
 * Remembers the reader's sort for the rest of the visit (story S1-E5-02, fourth criterion: "when
 * the reader moves to another list in the same session, then the choice is kept").
 *
 * It lives in sessionStorage: this tab only, gone when the tab closes, and never sent anywhere
 * (no tracking, CLAUDE.md rule 7). Storage can be missing or refuse (a private window, blocked
 * site data), so every read and write is guarded and the lists still work without it.
 * Who uses it: StoryListPage.
 */
import type { SortOrder } from '../api/storyLists';

import { sortFrom } from './listAddresses';

/** The sessionStorage key. */
const storageKey = 'story-list-sort';

/**
 * The sort the reader last picked in this tab.
 *
 * @returns the sort, or null when none was picked or storage can't be read
 */
export function rememberedSort(): SortOrder | null {
  try {
    const sortOrder = sortFrom(window.sessionStorage.getItem(storageKey));
    // "Best match" is for search only, so it never carries over to another list (S1-E5-04).
    return sortOrder === 'relevance' ? null : sortOrder;
  } catch {
    return null;
  }
}

/**
 * Keeps the reader's pick for the next list.
 *
 * @param sortOrder - the sort picked, or null for the list's own order
 */
export function rememberSort(sortOrder: SortOrder | null): void {
  try {
    if (sortOrder === null) window.sessionStorage.removeItem(storageKey);
    else window.sessionStorage.setItem(storageKey, sortOrder);
  } catch {
    // Storage refused (private window, blocked site data): the choice stays in the address only.
  }
}
