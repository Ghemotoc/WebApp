/**
 * Scoring and results as React hooks (bundle CLASS-POINTS, part 2; story S1-E8-15).
 *
 * Who calls it: CompetitionResultsPage and its parts. What it calls:
 * api/competitionScoring.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { competitionFailureOf } from '../api/competitionErrors';
import {
  fetchCompetitionScoring,
  publishCompetition,
  saveCompetitionScores,
  type ResultsRequest,
  type ScoresRequest,
} from '../api/competitionScoring';

import { classCompetitionsKey, refreshCompetitions } from './useClassCompetitions';

/**
 * The entrants of a competition, for its teacher.
 *
 * @param competitionId - the competition's ID, or null while it isn't known
 * @returns the query: data is the scoring page's data
 */
export function useCompetitionScoring(competitionId: string | null) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...classCompetitionsKey, 'scoring', competitionId, userId],
    queryFn: async () => fetchCompetitionScoring(await requireClient(), competitionId ?? ''),
    enabled: userId !== null && competitionId !== null,
  });
}

/**
 * The teacher saves one entrant's scores.
 *
 * @returns save(request), the failure and isRunning
 */
export function useSaveScores() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: ScoresRequest) =>
      saveCompetitionScores(await requireClient(), request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classCompetitionsKey }),
  });
  return {
    save: mutation.mutateAsync,
    failure: competitionFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * The teacher confirms the results.
 *
 * @returns publish(request), the failure and isRunning
 */
export function usePublishCompetition() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: ResultsRequest) =>
      publishCompetition(await requireClient(), request),
    onSuccess: () => refreshCompetitions(queryClient),
  });
  return {
    publish: mutation.mutateAsync,
    failure: competitionFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
