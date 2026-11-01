/**
 * useForumSearch: the results of one forum search, a page at a time (bundle FORUMS-1, part f;
 * story S1-E8-10).
 *
 * Who calls it: ForumSearchPage. What it calls: api/forumSearch.ts → search_forum_posts().
 * Nothing is asked while the term is shorter than 2 characters (it would find nothing).
 * Who the reader is changes what they may see (blocks), so signing in or out searches again.
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { searchForums, type ForumSearchPage, type ForumSearchQuery } from '../api/forumSearch';
import { useForumsTranslation } from '../registerForumsTranslations';

import { forumsQueryKey } from './useForumIndex';

/** The shortest term worth sending, as in search_forum_posts(). */
const shortestTerm = 2;

/**
 * Searches the forums.
 *
 * @param query - the term and filters, from the address
 * @returns results (null while loading or with no search yet), hasMore, showMore(),
 *   isLoadingMore, loadFailed and isSearching (a long enough term was given)
 */
export function useForumSearch(query: ForumSearchQuery) {
  const { userId } = useSession();
  const { i18n } = useForumsTranslation();
  const isSearching = query.term.trim().length >= shortestTerm;
  const search = useInfiniteQuery({
    queryKey: [forumsQueryKey, 'search', query, i18n.language, userId],
    queryFn: async ({ pageParam }: { pageParam: number }) =>
      searchForums(await requireClient(), query, { skip: pageParam, languageCode: i18n.language }),
    initialPageParam: 0,
    // The next page skips every result already shown.
    getNextPageParam: (lastPage: ForumSearchPage, pages: ForumSearchPage[]) =>
      lastPage.hasMore ? pages.reduce((shown, page) => shown + page.results.length, 0) : undefined,
    enabled: isSearching,
  });
  const pages = search.data?.pages ?? null;
  return {
    results: pages === null ? null : pages.flatMap((page) => page.results),
    hasMore: search.hasNextPage,
    showMore: () => void search.fetchNextPage(),
    isLoadingMore: search.isFetchingNextPage,
    loadFailed: search.isError,
    isSearching,
  };
}
