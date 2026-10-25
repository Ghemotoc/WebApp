/**
 * The address of every story list, and the list behind an address (stories S1-E5-01, S1-E5-09).
 *
 * Every See all page has its own address with its filters and sort in the query string, so a list
 * can be shared and opens the same for the next person (S1-E5-09, fourth criterion):
 *   /discover/all/<updated|new|completed|following>   the Discover shelves
 *   /discover/c/<category>                            a category page
 *   /discover/t/<tag>                                 a tag page
 *   /u/<username>/stories                             a writer's stories (from the profile)
 * and ?category=…&status=…&language=…&sort=… for the filters.
 * Who uses it: DiscoverPage (each shelf's "View more"), StoryListPage, CategoryChips, the story
 * page's tags.
 */
import type { CompletionStatus, ListKind, ListRequest, SortOrder } from '../api/storyLists';

/** The lists Discover links to under /discover/all/. */
export const discoverListKinds: readonly ListKind[] = ['updated', 'new', 'completed', 'following'];

/** The sort choices, in the order the drop-down shows them (S1-E5-02, first criterion). */
export const sortOrders: readonly SortOrder[] = [
  'updated',
  'newest',
  'oldest',
  'title_az',
  'title_za',
  'writer',
];

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
    updated: '/discover/all/updated',
    new: '/discover/all/new',
    completed: '/discover/all/completed',
    following: '/discover/all/following',
    category: `/discover/c/${key}`,
    tag: `/discover/t/${key}`,
    writer: `/u/${key}/stories`,
  };
  // Step 2: the query string carries the filters and the sort.
  const query = new URLSearchParams();
  if (request.categorySlug !== null) query.set('category', request.categorySlug);
  if (request.completion !== null) query.set('status', request.completion);
  if (request.languageCode !== null) query.set('language', request.languageCode);
  if (request.sortOrder !== null) query.set('sort', request.sortOrder);
  const search = query.toString();
  return search === '' ? paths[request.kind] : `${paths[request.kind]}?${search}`;
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
  return sortOrders.find((order) => order === value) ?? null;
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
  return {
    kind,
    key,
    // A category page is its own category filter.
    categorySlug: kind === 'category' ? null : search.get('category'),
    completion: completionFrom(search.get('status')),
    languageCode: language !== null && /^[a-z]{2}(-[A-Z]{2})?$/.test(language) ? language : null,
    sortOrder: sortFrom(search.get('sort')),
  };
}

/** The route's address parts (React Router's useParams()). */
export interface ListRouteParams {
  listKind?: string;
  categorySlug?: string;
  tag?: string;
  handle?: string;
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
  const kind = discoverListKinds.find((known) => known === params.listKind);
  return kind === undefined ? null : { kind, key: null };
}
