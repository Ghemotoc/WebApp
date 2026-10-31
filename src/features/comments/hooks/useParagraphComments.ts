/**
 * useParagraphComments: one paragraph's thread (story S1-E6-06).
 *
 * Who calls it: ParagraphThread. What it calls: api/paragraphComments.ts → paragraph_comments().
 * Its cache key starts with the chapter's comments key, so posting, replying, deleting, reacting
 * or downvoting anywhere on the chapter (useCommentActions and the others) refreshes it too.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';
import type { ParagraphPlace } from '@/features/reading/api/paragraphComments';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchParagraphThread } from '../api/paragraphComments';

import { commentsQueryKey } from './useChapterComments';

/**
 * Follows one paragraph's thread.
 *
 * @param address - the chapter
 * @param place - the paragraph's number, or 'earlier'
 * @returns the thread (null while loading or when the chapter can't be read) and loadFailed
 */
export function useParagraphComments(address: ChapterAddress, place: ParagraphPlace) {
  const { userId, isKnown } = useSession();
  const thread = useQuery({
    queryKey: [...commentsQueryKey(address, userId), 'paragraph', place],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchParagraphThread(client, address, place);
    },
  });
  return { thread: thread.data ?? null, loadFailed: thread.isError };
}
