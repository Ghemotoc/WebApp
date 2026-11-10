/**
 * A space moderator's change to a reply as a React hook (bundle GAPS-10; story S1-E8-07).
 *
 * Who calls it: PostSpaceModeration. What it calls: api/spacePostModeration.ts. After a change
 * every forum read refreshes, so the thread shows the reply hidden, back, or gone to its new
 * thread.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  moderateSpacePost,
  SpacePostModerationError,
  type SpacePostChange,
  type SpacePostFailure,
} from '../api/spacePostModeration';

import { forumsQueryKey } from './useForumIndex';

/**
 * Makes one change to a reply in a space.
 *
 * @returns run(change), the failure (null when none) and isRunning
 */
export function useModerateSpacePost() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (change: SpacePostChange) => moderateSpacePost(await requireClient(), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  // Anything else that went wrong is shown as "we couldn't save that".
  const error = mutation.error;
  let failure: SpacePostFailure | null = null;
  if (error instanceof SpacePostModerationError) failure = error.failure;
  else if (error !== null) failure = 'unreachable';
  return { run: mutation.mutateAsync, failure, isRunning: mutation.isPending };
}
