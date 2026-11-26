/**
 * useTrendingTags: the tags most read this week, for the Search page before a search (user story
 * 1.7, board A07-Search).
 *
 * Who calls it: TrendingTags. What it calls: fetchTrendingTags() → trending_tags().
 * Which tags show depends on who is reading (a story above the reader's age never counts), so
 * signing in reads them again.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchTrendingTags } from '../api/search';

/** How many tags board A07 draws. */
const trendingTagCount = 6;

/**
 * Reads the trending tags once a quarter of an hour at most; they change with the week's reads.
 *
 * @returns the query: data is the tag names, undefined while loading
 */
export function useTrendingTags() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['search', 'trendingTags', userId],
    queryFn: async () => fetchTrendingTags(await requireClient(), trendingTagCount),
    staleTime: 15 * 60 * 1000,
  });
}
