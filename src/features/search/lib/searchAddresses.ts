/**
 * The addresses of the search pages (story S1-E5-04).
 *
 *   /search?q=<term>            the search page: stories, writers and tags
 *   /search?q=<term>&in=<tab>   the same, opened on another results tab (writers, together,
 *                               spaces); the scope chips under the field set it (board A07)
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

/** The first results tab, which needs no "in" in the address. */
const firstScope = 'stories';

/**
 * The search page for a term, opened on one results tab.
 *
 * @param term - what the reader typed
 * @param scope - the results tab to open (user story 1.7, board A07's chips); Stories, the
 *   first tab, stays out of the address
 * @returns /search?q=…&in=…, or /search (with in=… when a scope is chosen) for an empty term
 */
export function searchAddress(term: string, scope: string = firstScope): string {
  // Step 1: the term, trimmed, when there is one.
  const query = new URLSearchParams();
  const trimmed = term.trim();
  if (trimmed !== '') query.set('q', trimmed);
  // Step 2: the scope, unless it is the first tab.
  if (scope !== firstScope) query.set('in', scope);
  const search = query.toString();
  return search === '' ? '/search' : `/search?${search}`;
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
