/**
 * searchFilters: the results page's tab, filters and sort, read from and written to the address
 * (user story 1.8, board A08-SearchResults).
 *
 * The address keeps everything, so a search can be shared and Back works: ?q= the term, ?in= the
 * tab (stories when missing), and for stories ?sort=, ?status= and ?language= as the See all page
 * uses them (listAddresses.ts). Kept apart from the components so a component file exports only
 * components.
 * Who uses it: SearchResults, SearchStoriesTab and SearchFilterFields.
 * What it calls: requestFromAddress() and listAddress() for the story list's own address rules.
 */
import type { ListRequest, SortOrder } from '@/features/discovery/api/storyLists';
import { listAddress, requestFromAddress } from '@/features/discovery/lib/listAddresses';

/** The results tabs, in the order board A08 draws them (Spaces comes with its search). */
export const searchTabs = ['stories', 'writers', 'together'] as const;

/** One results tab. */
export type SearchTab = (typeof searchTabs)[number];

/** The sorts board A08 offers: Best match, Most read and Newest chapter. */
export const searchSorts: readonly SortOrder[] = ['relevance', 'popular', 'updated'];

/** The languages the Language filter offers (the two interface languages); "Both" is no filter. */
export const searchLanguages = ['en', 'ro'] as const;

/**
 * The tab the address asks for; anything else is Stories.
 *
 * @param params - the address's query string
 * @returns the tab
 */
export function tabFrom(params: URLSearchParams): SearchTab {
  const asked = params.get('in');
  return searchTabs.find((tab) => tab === asked) ?? 'stories';
}

/**
 * The story list for this term and the address's filters.
 *
 * @param term - the search term
 * @param params - the address's query string
 * @returns the search list request
 */
export function storiesRequest(term: string, params: URLSearchParams): ListRequest {
  return requestFromAddress('search', term, params);
}

/**
 * The sort in use: the address's, else Best match.
 *
 * @param request - the search list
 * @returns the sort
 */
export function sortInUse(request: ListRequest): SortOrder {
  return request.sortOrder ?? 'relevance';
}

/**
 * How many filters are on, for "Filter and sort · 1" (the sort is not a filter).
 *
 * @param request - the search list
 * @returns 0, 1 or 2
 */
export function filtersOn(request: ListRequest): number {
  let count = 0;
  if (request.completion !== null) count += 1;
  if (request.languageCode !== null) count += 1;
  return count;
}

/**
 * The query string for a new set of filters, keeping the tab.
 *
 * @param next - the search list with its new filters
 * @param tab - the tab on screen
 * @returns the query string to put in the address
 */
export function paramsFor(next: ListRequest, tab: SearchTab): URLSearchParams {
  // Step 1: the See all address already writes q, sort, status and language by its own rules.
  const params = new URL(listAddress(next), 'https://example.invalid').searchParams;
  // Step 2: "Best match" is the page's own order, so it stays out of the address.
  if (params.get('sort') === 'relevance') params.delete('sort');
  // Step 3: the tab, unless it is the first one.
  if (tab !== 'stories') params.set('in', tab);
  return params;
}

/**
 * The query string for another tab, keeping the term and the filters.
 *
 * @param params - the address's query string now
 * @param tab - the tab chosen
 * @returns the new query string
 */
export function paramsForTab(params: URLSearchParams, tab: SearchTab): URLSearchParams {
  const next = new URLSearchParams(params);
  if (tab === 'stories') next.delete('in');
  else next.set('in', tab);
  return next;
}
