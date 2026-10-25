/**
 * useStoryList: every story of a list, 24 at a time, for a See all page (story S1-E5-09).
 *
 * Who calls it: StoryListPage. What it calls: api/storyLists.ts → browse_stories(). "Load more"
 * asks for the next 24 after the ones shown; the database keeps the same order on every page, so
 * pages never overlap (S1-E5-09, third criterion).
 */
import { useInfiniteQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchStoryList,
  type ListedStory,
  type ListRequest,
  type StoryListPage,
} from '../api/storyLists';

import { storyListQueryKey } from './useStoryShelf';

/** Stories per page: four rows of six on a wide screen (board 3.10). */
export const storiesPerPage = 24;

/**
 * Where the next page starts.
 *
 * @param lastPage - the page just read
 * @param allPages - every page so far
 * @returns the offset of the next page, or undefined when every story is shown
 */
function nextOffset(lastPage: StoryListPage, allPages: StoryListPage[]): number | undefined {
  const shown = allPages.reduce((count, page) => count + page.stories.length, 0);
  return shown < lastPage.total && lastPage.stories.length > 0 ? shown : undefined;
}

/**
 * Follows one list, page by page.
 *
 * @param request - the list, its filters and its sort
 * @returns total (null while loading), every story loaded so far, hasMore, loadMore(),
 *   isLoadingMore, isLoaded and loadFailed
 */
export function useStoryList(request: ListRequest) {
  const { userId, isKnown } = useSession();
  const pages = useInfiniteQuery({
    queryKey: [storyListQueryKey, 'page', request, userId],
    enabled: isKnown,
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    queryFn: async ({ pageParam }) => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchStoryList(client, request, { pageSize: storiesPerPage, offset: pageParam });
    },
  });
  const stories: ListedStory[] = (pages.data?.pages ?? []).flatMap((page) => page.stories);
  return {
    total: pages.data?.pages[0]?.total ?? null,
    stories,
    hasMore: pages.hasNextPage,
    loadMore: () => void pages.fetchNextPage(),
    isLoadingMore: pages.isFetchingNextPage,
    isLoaded: pages.isSuccess,
    loadFailed: pages.isError,
  };
}
