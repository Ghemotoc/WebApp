/**
 * recentSearches: the last few searches, kept on this device only (user story 1.7, board A07).
 *
 * The terms live in this browser's localStorage and never reach the server, so nobody else sees
 * them and nothing is stored about the person (CLAUDE.md rule 12). Storage can be missing or full
 * (a private window, blocked site data): every read and write is wrapped, and the page then simply
 * shows no recent searches.
 * Who uses it: SearchForm (adds a term on Search) and RecentSearches (lists, removes, clears).
 */

/** The localStorage key. */
export const RECENT_SEARCHES_KEY = 'ghemotoc.recentSearches';

/** How many terms are kept: the board shows three, and a few more cost nothing. */
export const MAX_RECENT_SEARCHES = 5;

/** The event other parts of the page listen to when the list changes. */
export const RECENT_SEARCHES_EVENT = 'recent-searches-changed';

/**
 * Reads the kept terms, newest first.
 *
 * @returns the terms, or an empty list when storage can't be read or holds something else
 */
export function readRecentSearches(): string[] {
  try {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored === null) return [];
    const parsed: unknown = JSON.parse(stored);
    // Keep only strings: anything else in the key is ignored rather than trusted.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/**
 * Saves the list and tells the page it changed.
 *
 * @param terms - the terms to keep, newest first
 */
function writeRecentSearches(terms: string[]): void {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    // Storage is off or full: the search still works, it just isn't remembered.
  }
  window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
}

/**
 * Puts a term first, without a duplicate (compared without case), and keeps the newest five.
 *
 * @param term - what was searched
 */
export function addRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (trimmed === '') return;
  const others = readRecentSearches().filter(
    (kept) => kept.toLocaleLowerCase() !== trimmed.toLocaleLowerCase(),
  );
  writeRecentSearches([trimmed, ...others].slice(0, MAX_RECENT_SEARCHES));
}

/**
 * Takes one term off the list (its × button).
 *
 * @param term - the term to remove
 */
export function removeRecentSearch(term: string): void {
  writeRecentSearches(readRecentSearches().filter((kept) => kept !== term));
}

/** Empties the list (Clear). */
export function clearRecentSearches(): void {
  writeRecentSearches([]);
}
