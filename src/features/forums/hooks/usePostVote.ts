/**
 * usePostVote: the vote buttons under a forum post as a React hook (bundle GAPS-16, part c).
 *
 * Who calls it: PostVotes. What it calls: api/forumVotes.ts → vote_forum_post().
 * After a change every forum read refreshes, so the count and the pressed button follow.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { setPostVote, type VoteChange } from '../api/forumVotes';

import { forumsQueryKey } from './useForumIndex';

/**
 * Votes on a post.
 *
 * @returns run(change), whether the last change failed, and isRunning
 */
export function usePostVote() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (change: VoteChange) => setPostVote(await requireClient(), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return { run: mutation.mutate, failed: mutation.isError, isRunning: mutation.isPending };
}
