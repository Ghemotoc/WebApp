/**
 * useManualAgeChecks: the open manual age checks and the decision (story S1-E2-08, part 08b).
 *
 * Who calls it: ManualAgeChecksPage. What it calls: api/manualAgeChecks.ts. After a decision the
 * list is read again, so a decided request leaves the page.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  decideManualAgeCheck,
  listManualAgeChecks,
  ManualAgeCheckError,
  type ManualAgeCheckFailure,
  type ManualAgeCheckRequest,
  type ManualDecision,
} from '../api/manualAgeChecks';

/** The cache key of the list. */
const manualAgeChecksKey = ['manual-age-checks'];

/**
 * The reason a call failed, or null when it didn't.
 *
 * @returns the reason; unreachable for anything that isn't a ManualAgeCheckError
 */
function failureOf(hasFailed: boolean, error: unknown): ManualAgeCheckFailure | null {
  if (!hasFailed) return null;
  return error instanceof ManualAgeCheckError ? error.failure : 'unreachable';
}

/**
 * Follows the open requests.
 *
 * @returns the requests, the decide action and their states
 */
export function useManualAgeChecks() {
  const queryClient = useQueryClient();
  const requests = useQuery<ManualAgeCheckRequest[]>({
    queryKey: manualAgeChecksKey,
    retry: false,
    queryFn: async () => listManualAgeChecks(await requireClient()),
  });
  const decide = useMutation({
    mutationFn: async (change: { requestId: string; decision: ManualDecision; reason: string }) =>
      decideManualAgeCheck(await requireClient(), change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: manualAgeChecksKey }),
  });

  return {
    requests: requests.data ?? [],
    isLoading: requests.isLoading,
    loadFailure: failureOf(requests.isError, requests.error),
    decide: decide.mutateAsync,
    isDeciding: decide.isPending,
    decideFailure: failureOf(decide.isError, decide.error),
  };
}
