/**
 * useBlock: block or unblock a person (story S1-E5-05).
 *
 * Who calls it: BlockDialog and the profile's Unblock button, and Settings' "Blocked accounts".
 * What it calls: api/blocks.ts → set_block(). Afterwards every cached profile, story page,
 * chapter, follow state and the blocked list are refreshed, because a block changes what each
 * of them shows (rule 6: blocks respected everywhere).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { setBlock } from '../api/blocks';

/** The cache keys a block can change. */
const keysChangedByABlock = [
  'writer-profile',
  'story-page',
  'reader-chapter',
  'follow-state',
  'my-blocked-accounts',
  'my-followers',
];

/**
 * Blocks or unblocks.
 *
 * @returns change(handle, shouldBlock), isSaving, hasFailed and reset()
 */
export function useBlock() {
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: async (request: { handle: string; shouldBlock: boolean }) =>
      setBlock(await requireClient(), request.handle, request.shouldBlock),
    onSuccess: async () => {
      // Step 1: refetch everything a block can change, one key at a time.
      for (const key of keysChangedByABlock) {
        await queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
  return {
    change: (handle: string, shouldBlock: boolean) => change.mutateAsync({ handle, shouldBlock }),
    isSaving: change.isPending,
    hasFailed: change.isError,
    reset: () => change.reset(),
  };
}
