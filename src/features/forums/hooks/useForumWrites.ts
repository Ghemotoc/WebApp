/**
 * The forum's writes as React hooks: start a thread, reply, edit and delete one's own post, and
 * the earlier versions moderators read (bundle FORUMS-1, part b; story S1-E8-02).
 *
 * Who calls it: NewThreadPage, ReplyForm, ForumPostCard and its parts. What it calls:
 * api/forumWrites.ts. After a write every forum read refreshes (the index's numbers, the forum's
 * list and the thread), so what the reader sees matches what was saved.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  deletePost,
  editPost,
  fetchPostHistory,
  ForumWriteError,
  replyToThread,
  startThread,
  type NewThread,
  type PostChange,
} from '../api/forumWrites';

import { forumsQueryKey } from './useForumIndex';

/**
 * The error a write failed with, as a ForumWriteError.
 *
 * @param error - whatever the write threw
 * @returns the error, or null when there is none
 */
function writeFailureOf(error: unknown): ForumWriteError | null {
  if (error === null || error === undefined) return null;
  return error instanceof ForumWriteError ? error : new ForumWriteError('unreachable');
}

/**
 * A write that refreshes every forum read when it succeeds.
 *
 * @param write - the write itself
 * @returns run(), the failure (null when none) and isRunning
 */
function useForumWrite<Input, Output>(
  write: (client: Awaited<ReturnType<typeof requireClient>>, input: Input) => Promise<Output>,
) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: Input) => write(await requireClient(), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    run: mutation.mutateAsync,
    failure: writeFailureOf(mutation.error),
    isRunning: mutation.isPending,
    reset: mutation.reset,
  };
}

/** Starts a thread; resolves with its number. */
export function useStartThread() {
  return useForumWrite((client, thread: NewThread) => startThread(client, thread));
}

/** Replies to one thread; resolves with the new post's number. */
export function useReplyToThread(threadNumber: number) {
  return useForumWrite((client, body: string) => replyToThread(client, threadNumber, body));
}

/** Changes one's own post. */
export function useEditPost() {
  return useForumWrite((client, change: PostChange) => editPost(client, change));
}

/** Deletes one's own post; resolves true when the thread went with it. */
export function useDeletePost() {
  return useForumWrite((client, postId: string) => deletePost(client, postId));
}

/**
 * A post's earlier versions, read only while the moderator has them open.
 *
 * @param postId - the post
 * @param isOpen - whether the list is showing
 * @returns versions (null while loading) and loadFailed
 */
export function usePostHistory(postId: string, isOpen: boolean) {
  const history = useQuery({
    queryKey: [forumsQueryKey, 'history', postId],
    queryFn: async () => fetchPostHistory(await requireClient(), postId),
    enabled: isOpen,
  });
  return { versions: history.data ?? null, loadFailed: history.isError };
}
