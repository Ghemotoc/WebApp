/**
 * useDownvoteComment: the reader's private downvote on one comment (story S1-E6-04).
 *
 * Who calls it: DownvoteButton. What it calls: api/downvotes.ts → downvote_comment(). After a
 * change, the chapter's comments are read again, so the button shows what the database holds.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';

import { downvoteComment } from '../api/downvotes';

import { commentErrorOf } from './useCommentActions';
import { commentsQueryKey } from './useChapterComments';

/**
 * Downvotes one comment, or takes the downvote back.
 *
 * @param address - the chapter the comment is on (to read its comments again)
 * @param commentId - the comment
 * @returns setDownvoted(true or false), isSaving and the last failure
 */
export function useDownvoteComment(address: ChapterAddress, commentId: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const downvote = useMutation({
    mutationFn: async (shouldDownvote: boolean) =>
      downvoteComment(await requireClient(), commentId, shouldDownvote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsQueryKey(address, userId) }),
  });
  return {
    setDownvoted: (shouldDownvote: boolean) => downvote.mutate(shouldDownvote),
    isSaving: downvote.isPending,
    failure: commentErrorOf(downvote.error),
  };
}
