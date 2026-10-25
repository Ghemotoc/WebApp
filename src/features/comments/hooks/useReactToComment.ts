/**
 * useReactToComment: picking a reaction on one comment (story S1-E6-02).
 *
 * Who calls it: CommentReactions. What it calls: api/reactions.ts → react_to_comment(). After a
 * pick, the chapter's comments are read again, so the chips show the counts the database holds.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';

import { reactToComment, type ReactionKind } from '../api/reactions';

import { commentErrorOf } from './useCommentActions';
import { commentsQueryKey } from './useChapterComments';

/**
 * Reacts to one comment.
 *
 * @param address - the chapter the comment is on (to read its comments again)
 * @param commentId - the comment
 * @returns react(kind or null), isReacting and the last failure
 */
export function useReactToComment(address: ChapterAddress, commentId: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const reaction = useMutation({
    mutationFn: async (wantedKind: ReactionKind | null) =>
      reactToComment(await requireClient(), commentId, wantedKind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsQueryKey(address, userId) }),
  });
  return {
    react: (wantedKind: ReactionKind | null) => reaction.mutate(wantedKind),
    isReacting: reaction.isPending,
    failure: commentErrorOf(reaction.error),
  };
}
