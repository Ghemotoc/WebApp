/**
 * useFeaturedStories: the stories in Featured this week, for the Discover band (story S1-E5-10).
 *
 * Who calls it: components/FeaturedBand.tsx. What it calls: api/featured.ts →
 * featured_stories_now(). What each person sees differs (ratings, blocks), so the cache key names
 * the reader; it shares the story lists' first key part, so a block refreshes it too.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchFeaturedStories } from '../api/featured';
import type { ListedStory } from '../api/storyLists';

import { storyListQueryKey } from './useStoryShelf';

/**
 * Loads the band.
 *
 * @returns stories: the picks this reader may see, or an empty list while loading or on failure
 */
export function useFeaturedStories(): { stories: ListedStory[] } {
  const { userId, isKnown } = useSession();
  const featured = useQuery<ListedStory[]>({
    queryKey: [storyListQueryKey, 'featured', userId],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchFeaturedStories(client);
    },
  });
  // A band that fails to load is simply not drawn: the shelves below still work.
  return { stories: featured.data ?? [] };
}
