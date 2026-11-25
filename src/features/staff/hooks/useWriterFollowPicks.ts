/**
 * useWriterFollowPicks: the "To follow this week" picks on Stories › Featured and saving them
 * (user story 1.4, board A04).
 *
 * Who calls it: components/featured/WriterFollowSection.tsx. What it calls:
 * api/writerFollowPicks.ts. After a save it reads the picks again, and the Read page's lists
 * (which share the rising-writers cache key) are read again too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { risingWritersQueryKey } from '@/features/discovery/hooks/useRisingWriters';

import {
  WriterFollowError,
  fetchWriterFollowPicks,
  saveWriterFollowPicks,
  type WriterFollowFailure,
  type WriterFollowPick,
} from '../api/writerFollowPicks';

/** The cache key's first part. */
const writerFollowKey = 'staff-writer-follow-picks';

/**
 * The reason a call failed, or null when it didn't.
 *
 * @returns the failure; unreachable for anything that isn't a WriterFollowError
 */
function failureOf(error: unknown): WriterFollowFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof WriterFollowError ? error.failure : 'unreachable';
}

/**
 * Follows the picks and offers a save.
 *
 * @returns picks (null while loading), loadFailure, save, isSaving, saveFailure and hasSaved
 */
export function useWriterFollowPicks() {
  const queryClient = useQueryClient();
  // Step 1: the current picks.
  const picks = useQuery<WriterFollowPick[]>({
    queryKey: [writerFollowKey],
    retry: false,
    queryFn: async () => fetchWriterFollowPicks(await requireClient()),
  });
  // Step 2: a save replaces them, then both the staff list and the Read page's lists are read again.
  const save = useMutation({
    mutationFn: async (input: { handles: string[]; reason: string }) =>
      saveWriterFollowPicks(await requireClient(), input.handles, input.reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [writerFollowKey] });
      await queryClient.invalidateQueries({ queryKey: [risingWritersQueryKey] });
    },
  });
  return {
    picks: picks.data ?? null,
    loadFailure: failureOf(picks.error),
    save: save.mutate,
    isSaving: save.isPending,
    saveFailure: failureOf(save.error),
    hasSaved: save.isSuccess,
  };
}
