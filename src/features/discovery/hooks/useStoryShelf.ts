/**
 * useStoryShelf: the first 21 stories of a list, for one shelf (story S1-E5-01).
 *
 * Who calls it: DiscoverShelf. What it calls: api/storyLists.ts → browse_stories(). A shelf shows
 * 20 and ends with "View more" when the list holds more (CLAUDE.md rule 20); asking for 21 is how
 * it knows, and the total names the count ("View all 54 in Recently updated").
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchStoryList, type ListRequest, type StoryListPage } from '../api/storyLists';

/** The first part of every list's cache key, so a block or a follow can refresh them all. */
export const storyListQueryKey = 'story-list';

/** One more than a shelf shows, so it knows there are more. */
const shelfRows = 21;

/**
 * Loads a shelf.
 *
 * @param request - the list
 * @returns shelf (null while loading), isLoaded, loadFailed
 */
export function useStoryShelf(request: ListRequest) {
  const { userId, isKnown } = useSession();
  const shelf = useQuery<StoryListPage>({
    // What each person sees differs (ratings, blocks, follows), so the key names them.
    queryKey: [storyListQueryKey, 'shelf', request, userId],
    // A shelf whose filter changes (the home page's genre chips, LOOK-3) keeps its stories until
    // the new ones arrive, so the row and its controls never vanish while it loads.
    placeholderData: keepPreviousData,
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchStoryList(client, request, { pageSize: shelfRows, offset: 0 });
    },
  });
  return { shelf: shelf.data ?? null, isLoaded: shelf.isSuccess, loadFailed: shelf.isError };
}
