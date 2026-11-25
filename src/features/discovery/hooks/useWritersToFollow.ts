/**
 * useWritersToFollow: "To follow this week" for the Read page's Writers box (user story 1.4,
 * board A04).
 *
 * Who calls it: components/ReadWritersBox.tsx. What it calls: api/writersToFollow.ts →
 * writers_to_follow_now(). What each person sees differs (blocks, themselves), so the cache key
 * names the reader; it shares its first part with New and rising writers, so Settings › Privacy's
 * fresh read after "Suggest me" changes reaches both lists.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import type { RisingWriter } from '../api/risingWriters';
import { fetchWritersToFollow, type WritersToFollow } from '../api/writersToFollow';

import { risingWritersQueryKey } from './useRisingWriters';

/**
 * Loads the list.
 *
 * @returns writers: the list, or an empty one while loading or on failure (the list then hides)
 */
export function useWritersToFollow(): { writers: RisingWriter[] } {
  const { userId, isKnown } = useSession();
  const toFollow = useQuery<WritersToFollow>({
    queryKey: [risingWritersQueryKey, 'to-follow', userId],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchWritersToFollow(client);
    },
  });
  // A list that fails to load is simply not drawn: the rest of the Read page still works.
  return { writers: toFollow.data?.writers ?? [] };
}
