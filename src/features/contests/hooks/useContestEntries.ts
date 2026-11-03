/**
 * useContestEntries: one contest's entries in Staff › Contests: disqualifying an entry (story
 * S1-E11-15 criteria 5 and 6; bundle CONTESTS-13b2a), choosing winners and finalists, publishing
 * the results and marking prizes as sent (criteria 7, 8 and 10; part 13b2b) and issuing
 * certificates (criterion 9; part 13b2c).
 *
 * Who calls it: ContestEntriesSection and ContestResultsPanel, inside ContestEditorPage.
 * What it calls: api/contestEntries.ts. After every change the entries and the contest are read
 * again, so the table shows what the database now holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { ContestPlacing } from '@/schemas/contests';

import {
  disqualifyContestEntry,
  fetchContestEntries,
  issueContestCertificates,
  markContestPrizeSent,
  publishContestResults,
  setContestPlacing,
} from '../api/contestEntries';

import { contestFailureOf, contestsQueryKey } from './useStoryContests';

/** What a disqualification needs. */
export interface DisqualifyRequest {
  entryId: string;
  reason: string;
}

/**
 * One judging change: a placing, publishing the results, a prize sent or issuing certificates
 * (issued is how many were made or changed, filled in once the database answers).
 */
export type JudgingChange =
  | { kind: 'placing'; entryId: string; placing: ContestPlacing | null }
  | { kind: 'publish' }
  | { kind: 'prize'; entryId: string; parentConsentOnFile: boolean }
  | { kind: 'certificates'; issued: number };

/**
 * Sends one judging change to the database.
 *
 * @param contestId - the contest
 * @param change - what staff chose
 * @returns the change, so the screen can say what was done
 */
async function sendJudgingChange(contestId: string, change: JudgingChange): Promise<JudgingChange> {
  const client = await requireClient();
  if (change.kind === 'placing') {
    await setContestPlacing(client, change.entryId, change.placing);
  } else if (change.kind === 'publish') {
    await publishContestResults(client, contestId);
  } else if (change.kind === 'certificates') {
    // The count comes back from the database, so the screen can say how many were issued.
    return { kind: 'certificates', issued: await issueContestCertificates(client, contestId) };
  } else {
    await markContestPrizeSent(client, change.entryId, change.parentConsentOnFile);
  }
  return change;
}

/**
 * Reads the entries and offers disqualify() and judge().
 *
 * @param contestId - the contest
 * @returns the query, the two actions, their last results and failures, and whether one runs
 */
export function useContestEntries(contestId: string) {
  const queryClient = useQueryClient();
  const queryKey = [...contestsQueryKey, 'staff', 'entries', contestId];
  const entries = useQuery({
    queryKey,
    queryFn: async () => fetchContestEntries(await requireClient(), contestId),
  });
  // Every change can move the entries and the contest (results published), so both are re-read.
  const refresh = () => queryClient.invalidateQueries({ queryKey: [...contestsQueryKey, 'staff'] });
  const disqualifying = useMutation({
    mutationFn: async (request: DisqualifyRequest) =>
      disqualifyContestEntry(await requireClient(), request.entryId, request.reason),
    onSettled: refresh,
  });
  const judging = useMutation({
    mutationFn: (change: JudgingChange) => sendJudgingChange(contestId, change),
    onSettled: refresh,
  });
  return {
    entries,
    disqualify: (request: DisqualifyRequest, onDone: () => void) =>
      disqualifying.mutate(request, { onSuccess: onDone }),
    statementReference: disqualifying.data ?? null,
    failure: contestFailureOf(disqualifying.error),
    judge: (change: JudgingChange) => judging.mutate(change),
    lastJudging: judging.isSuccess ? judging.data : null,
    judgingFailure: contestFailureOf(judging.error),
    isRunning: disqualifying.isPending || judging.isPending,
  };
}
