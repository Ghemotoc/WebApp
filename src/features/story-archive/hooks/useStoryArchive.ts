/**
 * The hooks behind Archived stories (bundle ARCHIVE-1).
 *
 * Who calls them: ArchivedStoriesSection and ArchivedStoriesForm.
 * What they call: api/storyArchive.ts. After stories come back every cached answer is read
 * again, because the writer's story lists, plans and Story Atlas all changed at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  claimStoryArchive,
  fetchMyStoryArchive,
  type ArchiveClaim,
  type ArchiveClaimOutcome,
  type StoryArchiveState,
} from '../api/storyArchive';

/** The cache key of whether archived stories wait, per person. */
export function storyArchiveKey(userId: string | null) {
  return ['story-archive', userId] as const;
}

/**
 * Whether archived stories wait for the signed-in person's email address.
 *
 * @returns TanStack Query's result; disabled while signed out
 */
export function useMyStoryArchive() {
  const { userId } = useSession();
  return useQuery<StoryArchiveState>({
    queryKey: storyArchiveKey(userId),
    enabled: userId !== null,
    retry: false,
    queryFn: async () => fetchMyStoryArchive(await requireClient()),
  });
}

/**
 * "Bring stories back".
 *
 * @returns TanStack Query's mutation; its data is the outcome
 */
export function useClaimStoryArchive() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return useMutation<ArchiveClaimOutcome, Error, ArchiveClaim>({
    mutationFn: async (claim) => claimStoryArchive(await requireClient(), claim),
    onSuccess: async (outcome) => {
      // Stories came back: every list of the writer's is stale. The archive's own answer is
      // left as it was, so the panel stays on screen to say what happened.
      if (outcome.outcome === 'restored') {
        await queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] !== storyArchiveKey(userId)[0],
        });
      }
    },
  });
}
