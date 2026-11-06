/**
 * useForumHighlights: the home page's busy threads and public spaces (bundle LOOK-3).
 *
 * Who calls it: components/CommunityBand.tsx. What it calls: api/forumHighlights.ts →
 * public_forum_highlights(). What a reader sees depends on their blocks, so the cache key names
 * the reader.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchForumHighlights, type ForumHighlights } from '../api/forumHighlights';

/**
 * Loads the highlights.
 *
 * @param language - the page's language
 * @returns highlights: the lists, or null while loading or when the read failed (the band then
 *   shows its words and button without the list)
 */
export function useForumHighlights(language: string): { highlights: ForumHighlights | null } {
  const { userId, isKnown } = useSession();
  const read = useQuery<ForumHighlights>({
    queryKey: ['forum-highlights', userId, language],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchForumHighlights(client, language);
    },
  });
  return { highlights: read.data ?? null };
}
