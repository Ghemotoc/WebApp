/**
 * useRisingWriters: New and rising writers, for Discover's "Writers to follow this week" shelf
 * (story S1-E5-11, bundle LOOK-4c) and later the home page (LOOK-3).
 *
 * Who calls it: components/RisingWritersShelf.tsx. What it calls: api/risingWriters.ts →
 * rising_writers(). What each person sees differs (blocks, themselves, ratings), so the cache key
 * names the reader. Settings › Privacy reads it again after "Suggest me" changes.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchRisingWriters, type RisingWriter } from '../api/risingWriters';

/** The first part of the cache key, so other screens can ask for a fresh read. */
export const risingWritersQueryKey = 'rising-writers';

/**
 * Loads the writers.
 *
 * @returns writers: the list, or an empty one while loading or on failure (the shelf then hides)
 */
export function useRisingWriters(): { writers: RisingWriter[] } {
  const { userId, isKnown } = useSession();
  const rising = useQuery<RisingWriter[]>({
    queryKey: [risingWritersQueryKey, userId],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchRisingWriters(client);
    },
  });
  // A shelf that fails to load is simply not drawn: the rest of Discover still works.
  return { writers: rising.data ?? [] };
}
