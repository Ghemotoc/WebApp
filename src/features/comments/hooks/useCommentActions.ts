/**
 * useCommentActions: posting, replying and deleting on one chapter (story S1-E6-01).
 *
 * Who calls it: CommentComposer (post and reply) and CommentActions (delete). What it calls:
 * api/comments.ts → post_comment() and delete_comment(). After either, the chapter's comments are
 * read again, so the list shows what the database now holds.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';

import { CommentError, deleteComment, postComment, type NewComment } from '../api/comments';

import { commentsQueryKey } from './useChapterComments';

/**
 * The error a call threw, as a CommentError.
 *
 * @param error - what it threw, or null
 * @returns the CommentError, an unreachable one for anything else, or null
 */
export function commentErrorOf(error: unknown): CommentError | null {
  if (error === null || error === undefined) return null;
  return error instanceof CommentError ? error : new CommentError('unreachable');
}

/**
 * Posts a comment or a reply on one chapter.
 *
 * @param address - the chapter
 * @returns post(comment) (resolves once saved), isPosting and the last failure
 */
export function usePostComment(address: ChapterAddress) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const post = useMutation({
    mutationFn: async (comment: NewComment) => postComment(await requireClient(), address, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsQueryKey(address, userId) }),
  });
  return {
    post: (comment: NewComment) => post.mutateAsync(comment),
    isPosting: post.isPending,
    failure: commentErrorOf(post.error),
  };
}

/**
 * Deletes comments on one chapter.
 *
 * @param address - the chapter
 * @returns remove(commentId), isDeleting and the last failure
 */
export function useDeleteComment(address: ChapterAddress) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (commentId: string) => deleteComment(await requireClient(), commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsQueryKey(address, userId) }),
  });
  return {
    remove: (commentId: string) => remove.mutateAsync(commentId),
    isDeleting: remove.isPending,
    failure: commentErrorOf(remove.error),
  };
}
