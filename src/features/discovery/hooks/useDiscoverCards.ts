/**
 * useDiscoverCards: the signed-in member's three Discover cards (story S1-E5-12, bundle LOOK-4b).
 *
 * Who calls it: components/DiscoverCards.tsx. What it calls: api/discoverCards.ts →
 * my_discover_cards(). Nothing is read for a visitor, who sees none of the cards.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchDiscoverCards, type DiscoverCardsData } from '../api/discoverCards';

/**
 * Loads the cards.
 *
 * @returns cards: the data, or null for a visitor, while loading or when the read failed (the
 *   cards then stay hidden and the rest of Discover still works)
 */
export function useDiscoverCards(): { cards: DiscoverCardsData | null } {
  const { userId } = useSession();
  const read = useQuery<DiscoverCardsData>({
    queryKey: ['discover-cards', userId],
    enabled: userId !== null,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchDiscoverCards(client);
    },
  });
  return { cards: userId === null ? null : (read.data ?? null) };
}
