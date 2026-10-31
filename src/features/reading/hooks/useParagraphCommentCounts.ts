/**
 * useParagraphCommentCounts: the comment count beside each paragraph (story S1-E6-06).
 *
 * Who calls it: ChapterReaderPage. What it calls: api/paragraphComments.ts →
 * paragraph_comment_counts(). Only a signed-in reader gets markers (a visitor sees the teaser,
 * S1-E4-04), so nothing is asked while signed out.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import type { ChapterAddress } from '../api/likes';
import {
  fetchParagraphCounts,
  paragraphCountsQueryKey,
  type ParagraphCounts,
} from '../api/paragraphComments';

/**
 * Follows one chapter's paragraph counts.
 *
 * @param address - the chapter
 * @param hasText - false while there is no text to put markers beside
 * @returns the counts, or null while loading, signed out, when it failed or when comments are off
 */
export function useParagraphCommentCounts(
  address: ChapterAddress,
  hasText: boolean,
): ParagraphCounts | null {
  const { userId, isKnown } = useSession();
  const counts = useQuery({
    queryKey: paragraphCountsQueryKey(address, userId),
    enabled: isKnown && userId !== null && hasText,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchParagraphCounts(client, address);
    },
  });
  // A failed read only means no markers: the comments under the chapter still work.
  const answer = counts.data ?? null;
  if (answer === null || !answer.commentsEnabled) return null;
  return answer;
}
