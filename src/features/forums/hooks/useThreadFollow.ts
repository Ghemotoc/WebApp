/**
 * useThreadFollow: the Follow thread button as a React hook (bundle GAPS-16, part a; S1-E8-02).
 *
 * Who calls it: ThreadFollowButton. What it calls: api/forumFollows.ts → follow_forum_thread().
 * After a change every forum read refreshes, so the thread page shows the new state.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { setThreadFollow, type FollowChange } from '../api/forumFollows';

import { forumsQueryKey } from './useForumIndex';

/**
 * Follows or unfollows a thread.
 *
 * @returns run(change), whether the last change failed, and isRunning
 */
export function useThreadFollow() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (change: FollowChange) => setThreadFollow(await requireClient(), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return { run: mutation.mutate, failed: mutation.isError, isRunning: mutation.isPending };
}
