/**
 * useStorySearch: one search across the open story (story S1-E17-30).
 *
 * Runs only for a query of two letters or more, and keeps each query's answer, so going back to
 * an earlier search is instant. Who calls it: AtlasSearchPage. What it calls: api/search.ts →
 * search_story().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { searchStory, shortestSearch, storySearchQueryKey } from '../api/search';

/**
 * Searches a story.
 *
 * @param slug - the story's address
 * @param query - what the writer typed
 * @returns results (null when the story isn't the writer's, undefined while waiting or for a
 *   query too short), loadFailed and isTooShort
 */
export function useStorySearch(slug: string, query: string) {
  const { userId } = useSession();
  const wanted = query.trim();
  const isTooShort = wanted.length < shortestSearch;
  const results = useQuery({
    queryKey: storySearchQueryKey(userId, slug, wanted),
    enabled: userId !== null && slug !== '' && !isTooShort,
    queryFn: async () => searchStory(await requireClient(), slug, wanted),
  });
  return { results: results.data, loadFailed: results.isError, isTooShort };
}
