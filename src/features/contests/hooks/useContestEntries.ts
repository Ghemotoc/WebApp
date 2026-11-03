/**
 * useContestEntries: one contest's entries in Staff › Contests, and disqualifying an entry
 * (story S1-E11-15 criteria 5 and 6; bundle CONTESTS-13b2a).
 *
 * Who calls it: ContestEntriesSection, inside ContestEditorPage.
 * What it calls: api/contestEntries.ts. After a disqualification the list is read again, so the
 * entry shows as Disqualified with its statement's reference.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { disqualifyContestEntry, fetchContestEntries } from '../api/contestEntries';

import { contestFailureOf, contestsQueryKey } from './useStoryContests';

/** What a disqualification needs. */
export interface DisqualifyRequest {
  entryId: string;
  reason: string;
}

/**
 * Reads the entries and offers disqualify().
 *
 * @param contestId - the contest
 * @returns the query, disqualify(), the last statement's reference, its failure and whether one is
 *   running
 */
export function useContestEntries(contestId: string) {
  const queryClient = useQueryClient();
  const queryKey = [...contestsQueryKey, 'staff', 'entries', contestId];
  const entries = useQuery({
    queryKey,
    queryFn: async () => fetchContestEntries(await requireClient(), contestId),
  });
  const mutation = useMutation({
    mutationFn: async (request: DisqualifyRequest) =>
      disqualifyContestEntry(await requireClient(), request.entryId, request.reason),
    // The entry changed, so the list is read again.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  return {
    entries,
    disqualify: (request: DisqualifyRequest, onDone: () => void) =>
      mutation.mutate(request, { onSuccess: onDone }),
    statementReference: mutation.data ?? null,
    failure: contestFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
