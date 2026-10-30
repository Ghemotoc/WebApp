/**
 * useFoundWritersList and useFoundTagsList: every writer or every tag a search finds, a page at a
 * time, for their See all pages (story S1-E5-04).
 *
 * Who calls them: SearchGroupPage. What they call: api/search.ts, 24 at a time, the same page size
 * as the story See all pages (useStoryList).
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchFoundTags, fetchFoundWriters, type FoundPage, type PageWindow } from '../api/search';
import { isSearchable } from '../lib/searchAddresses';

/** How many each "Load more" adds. */
const rowsPerPage = 24;

/** Reads one page of a group. */
type PageReader<Item> = (
  client: AppSupabaseClient,
  term: string,
  window: PageWindow,
) => Promise<FoundPage<Item>>;

/**
 * Where the next page starts, or undefined when every result is loaded.
 *
 * @param last - the page just loaded
 * @param pages - every page so far
 * @returns the next offset
 */
function nextOffset<Item>(last: FoundPage<Item>, pages: FoundPage<Item>[]): number | undefined {
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
  return loaded < last.total ? loaded : undefined;
}

/**
 * Loads one group's results with "Load more".
 *
 * @param group - the group's name, for the cache key
 * @param term - the search term
 * @param readPage - the api function for the group
 * @returns items so far, total (null while loading), hasMore, loadMore, isLoadingMore, isLoaded,
 *   loadFailed
 */
function useFoundList<Item>(group: string, term: string, readPage: PageReader<Item>) {
  const { userId, isKnown } = useSession();
  const pages = useInfiniteQuery({
    // What each person sees differs (blocks, ratings), so the key names them.
    queryKey: ['search', group, 'all', term, userId],
    enabled: isKnown && isSearchable(term),
    initialPageParam: 0,
    getNextPageParam: nextOffset<Item>,
    queryFn: async ({ pageParam }) =>
      readPage(await requireClient(), term, { pageSize: rowsPerPage, offset: pageParam }),
  });
  const loaded = pages.data?.pages ?? [];
  return {
    items: loaded.flatMap((page) => page.items),
    total: loaded[0]?.total ?? null,
    hasMore: pages.hasNextPage,
    loadMore: () => void pages.fetchNextPage(),
    isLoadingMore: pages.isFetchingNextPage,
    isLoaded: pages.isSuccess,
    loadFailed: pages.isError,
  };
}

/**
 * Every writer a search finds.
 *
 * @param term - the search term
 * @returns as useFoundList()
 */
export function useFoundWritersList(term: string) {
  return useFoundList('writers', term, fetchFoundWriters);
}

/**
 * Every tag a search finds.
 *
 * @param term - the search term
 * @returns as useFoundList()
 */
export function useFoundTagsList(term: string) {
  return useFoundList('tags', term, fetchFoundTags);
}
