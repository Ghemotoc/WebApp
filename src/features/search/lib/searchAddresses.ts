/**
 * The addresses of the search pages (story S1-E5-04).
 *
 *   /search?q=<term>            the search page: stories, writers and tags
 *   /search/stories?q=<term>    every story it finds (the shared See all page, StoryListPage)
 *   /search/writers?q=<term>    every writer it finds
 *   /search/tags?q=<term>       every tag it finds
 * The term lives in the address, so a search can be shared and the back button works.
 * Who uses it: SearchForm, SearchResults and SearchGroupPage.
 */

/** The fewest letters a search needs; the database answers nothing for less. */
export const MINIMUM_SEARCH_LENGTH = 2;

/** The groups of results, in the order the page shows them. */
export type SearchGroup = 'stories' | 'writers' | 'tags';

/** Every group, in order. */
export const searchGroups: readonly SearchGroup[] = ['stories', 'writers', 'tags'];

/**
 * The search page for a term.
 *
 * @param term - what the reader typed
 * @returns /search?q=…, or /search for an empty term
 */
export function searchAddress(term: string): string {
  const trimmed = term.trim();
  if (trimmed === '') return '/search';
  return `/search?${new URLSearchParams({ q: trimmed }).toString()}`;
}

/**
 * The page with every result of one group.
 *
 * @param group - stories, writers or tags
 * @param term - the search term
 * @returns /search/<group>?q=…
 */
export function groupAddress(group: SearchGroup, term: string): string {
  return `/search/${group}?${new URLSearchParams({ q: term.trim() }).toString()}`;
}

/**
 * Whether a term is long enough to search, counting letters without spaces at either end.
 *
 * @param term - what the reader typed
 * @returns true for 2 letters or more
 */
export function isSearchable(term: string): boolean {
  return term.trim().length >= MINIMUM_SEARCH_LENGTH;
}
