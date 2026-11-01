/**
 * The moderator tools' change as a React hook (bundle FORUMS-1, part e; story S1-E8-05).
 *
 * Who calls it: ThreadModeration. What it calls: api/forumModeration.ts. After a change every
 * forum read refreshes, so the thread shows its new lock and the forum's list its new order.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  ForumModerationError,
  moderateThread,
  type ThreadModeration,
} from '../api/forumModeration';

import { forumsQueryKey } from './useForumIndex';

/**
 * Makes one moderator change to a thread.
 *
 * @returns run(change), the failure (null when none) and isRunning
 */
export function useModerateThread() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (change: ThreadModeration) => moderateThread(await requireClient(), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  // Anything else that went wrong is shown as "we couldn't reach the server".
  const error = mutation.error;
  let failure: ForumModerationError | null = null;
  if (error instanceof ForumModerationError) failure = error;
  else if (error !== null) failure = new ForumModerationError('unreachable');
  return { run: mutation.mutateAsync, failure, isRunning: mutation.isPending };
}
