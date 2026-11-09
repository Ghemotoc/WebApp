/**
 * The address of every story list, and the list behind an address (stories S1-E5-01, S1-E5-09).
 *
 * Every See all page has its own address with its filters and sort in the query string, so a list
 * can be shared and opens the same for the next person (S1-E5-09, fourth criterion):
 *   /discover/all/<popular|rising|shared|updated|new|completed|following|picked|classics>   the Discover shelves
 *   /discover/c/<category>                            a category page
 *   /discover/t/<tag>                                 a tag page
 *   /u/<username>/stories                             a writer's stories (from the profile)
 *   /search/stories?q=<term>                          the stories a search finds (S1-E5-04)
 *   /library/<reading|saved|finished>                 one shelf of the reader's library (S1-E4-03)
 *   /u/<username>/library                             someone's library, from their profile (S1-E13-01)
 * and ?category=…&status=…&language=…&sort=… for the filters.
 * Who uses it: DiscoverPage (each shelf's "View more"), StoryListPage, StoryBreadcrumb, the story
 * page's tags.
 */
import type { CompletionStatus, ListKind, ListRequest, SortOrder } from '../api/storyLists';

/** The lists Discover links to under /discover/all/. */
export const discoverListKinds: readonly ListKind[] = [
  'popular',
  'rising',
  'shared',
  'updated',
  'new',
  'completed',
  'following',
  'picked',
  'classics',
];

/**
 * The sort choices, in the order the drop-down shows them (S1-E5-02, first criterion): Popular
 * first, because it is the default (S1-E5-03).
 */
export const sortOrders: readonly SortOrder[] = [
  'popular',
  'updated',
  'newest',
  'oldest',
  'title_az',
  'title_za',
  'writer',
];

/**
 * The sorts a list's drop-down offers: search adds "Best match" first (S1-E5-04) and "Most
 * shared this week" adds "Most shared this week" first (IDEAS-1e); the database refuses each on
 * any other list.
 *
 * @param kind - which list
 * @returns the sorts, in the drop-down's order
 */
export function sortChoicesFor(kind: ListKind): readonly SortOrder[] {
  if (kind === 'search') return ['relevance', ...sortOrders];
  // IDEAS-1e: "Most shared this week" adds its own order first, which no other list accepts.
  if (kind === 'shared') return ['shared', ...sortOrders];
  return sortOrders;
}

/**
 * The page that lists every story of a list (its See all page).
 *
 * @param request - the list and its filters
 * @returns the address, with the filters that are set
 */
export function listAddress(request: ListRequest): string {
  // Step 1: the path names the list.
  const key = encodeURIComponent(request.key ?? '');
  const paths: Record<ListKind, string> = {
    popular: '/discover/all/popular',
    rising: '/discover/all/rising',
    shared: '/discover/all/shared',
    updated: '/discover/all/updated',
    new: '/discover/all/new',
    completed: '/discover/all/completed',
    following: '/discover/all/following',
    picked: '/discover/all/picked',
    classics: '/discover/all/classics',
    category: `/discover/c/${key}`,
    tag: `/discover/t/${key}`,
    writer: `/u/${key}/stories`,
    search: '/search/stories',
    library: `/library/${key}`,
    reader_library: `/u/${key}/library`,
  };
  // Step 2: the query string carries the search term, the filters and the sort.
  const query = new URLSearchParams();
  if (request.kind === 'search') query.set('q', request.key ?? '');
  if (request.categorySlug !== null) query.set('category', request.categorySlug);
  if (request.completion !== null) query.set('status', request.completion);
  if (request.languageCode !== null) query.set('language', request.languageCode);
  if (request.sortOrder !== null) query.set('sort', request.sortOrder);
  const search = query.toString();
  return search === '' ? paths[request.kind] : `${paths[request.kind]}?${search}`;
}

/**
 * The order a list has when the reader hasn't picked one: the same rule as the database's
 * list_default_sort() (S1-E5-03; S1-E5-02, first criterion). New stories are newest first,
 * Recently updated, the follows shelf and the library's shelves (S1-E4-03) by their last chapter;
 * "Most shared this week" by this week's shares (IDEAS-1e); every other list is popular.
 *
 * @param kind - which list
 * @returns the list's own sort
 */
export function listDefaultSort(kind: ListKind): SortOrder {
  if (kind === 'new') return 'newest';
  if (kind === 'updated' || kind === 'following' || kind === 'library') return 'updated';
  if (kind === 'search') return 'relevance';
  if (kind === 'shared') return 'shared';
  return 'popular';
}

/**
 * A plain list with no filters, for a shelf.
 *
 * @param kind - which list
 * @param key - the category, tag or username, or null
 * @returns the request
 */
export function plainList(kind: ListKind, key: string | null = null): ListRequest {
  return { kind, key, categorySlug: null, completion: null, languageCode: null, sortOrder: null };
}

/**
 * The status filter from the address; anything else counts as no filter.
 *
 * @param value - ?status=
 * @returns ongoing, completed or null
 */
function completionFrom(value: string | null): CompletionStatus | null {
  return value === 'ongoing' || value === 'completed' ? value : null;
}

/**
 * The sort from the address; anything else counts as the list's own order.
 *
 * @param value - ?sort=
 * @returns a known sort or null
 */
export function sortFrom(value: string | null): SortOrder | null {
  return sortChoicesFor('search').find((order) => order === value) ?? null;
}

/**
 * The list behind an address.
 *
 * @param kind - which list the route stands for
 * @param key - the category, tag or username from the path, or null
 * @param search - the query string
 * @returns the request
 */
export function requestFromAddress(
  kind: ListKind,
  key: string | null,
  search: URLSearchParams,
): ListRequest {
  const language = search.get('language');
  const sortOrder = sortFrom(search.get('sort'));
  return {
    kind,
    key,
    // A category page is its own category filter.
    categorySlug: kind === 'category' ? null : search.get('category'),
    completion: completionFrom(search.get('status')),
    languageCode: language !== null && /^[a-z]{2}(-[A-Z]{2})?$/.test(language) ? language : null,
    // "Best match" belongs to search only (S1-E5-04).
    sortOrder: sortOrder === 'relevance' && kind !== 'search' ? null : sortOrder,
  };
}

/** The route's address parts (React Router's useParams()). */
export interface ListRouteParams {
  listKind?: string;
  categorySlug?: string;
  tag?: string;
  handle?: string;
  /** The search term (?q=) on /search/stories (S1-E5-04). */
  searchTerm?: string;
  /** The shelf on /library/:shelf (S1-E4-03). */
  shelf?: string;
  /** The username on /u/:readerHandle/library (S1-E13-01). */
  readerHandle?: string;
}

/**
 * Which list a route stands for, from the part of the address that is set.
 *
 * @param params - the route's parts: /discover/all/:listKind, /discover/c/:categorySlug,
 *   /discover/t/:tag or /u/:handle/stories
 * @returns the kind and its key, or null for an address such as /discover/all/nothing
 */
export function listFromParams(
  params: ListRouteParams,
): { kind: ListKind; key: string | null } | null {
  if (params.categorySlug !== undefined) return { kind: 'category', key: params.categorySlug };
  if (params.tag !== undefined) return { kind: 'tag', key: params.tag };
  if (params.handle !== undefined) return { kind: 'writer', key: params.handle };
  if (params.readerHandle !== undefined)
    return { kind: 'reader_library', key: params.readerHandle };
  if (params.searchTerm !== undefined) return { kind: 'search', key: params.searchTerm };
  // S1-E4-03: a library shelf; any other word is no list.
  if (params.shelf !== undefined) {
    const isShelf = ['reading', 'saved', 'finished'].includes(params.shelf);
    return isShelf ? { kind: 'library', key: params.shelf } : null;
  }
  const kind = discoverListKinds.find((known) => known === params.listKind);
  return kind === undefined ? null : { kind, key: null };
}
