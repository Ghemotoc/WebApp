/**
 * useRankingPlace: a story's place in its category (story S1-E15-05, bundle ANALYTICS-1b).
 *
 * Who calls it: components/RankingPlacePill.tsx (the story page) and the staff story page.
 * What it calls: api/rankingPlace.ts. The score changes once an hour, so one read per visit is
 * enough. A failed read shows nothing: the place is extra, and the page works without it.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchRankingPlace, type RankingPlace } from '../api/rankingPlace';

/**
 * Loads the place.
 *
 * @param storySlug - the story's address
 * @returns the place, or null while loading, after a failure or when there is none
 */
export function useRankingPlace(storySlug: string): RankingPlace | null {
  const { userId, isKnown } = useSession();
  const query = useQuery<RankingPlace | null>({
    queryKey: ['ranking-place', storySlug, userId],
    enabled: isKnown && storySlug !== '',
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) return null;
      try {
        return await fetchRankingPlace(client, storySlug);
      } catch (error) {
        // Say so in the console only: the page doesn't need the place to work.
        console.warn('The ranking place was not shown.', error);
        return null;
      }
    },
  });
  return query.data ?? null;
}
