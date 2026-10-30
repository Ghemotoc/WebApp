/**
 * useCaseClaim and useCasePicture: claiming a case, and the picture of a picture case (stories
 * S1-E10-03b and S1-E10-05).
 *
 * Who calls them: CasePage (ClaimControl and CasePicturePanel).
 * What they call: api/caseClaims.ts. After a claim or a release every 'moderation' query is read
 * again, so the queue and the case show who has it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { claimCase, fetchCasePicture, releaseCase } from '../api/caseClaims';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Claim and release for one case.
 *
 * @param caseId - the case's ID
 * @returns claim(), release(), whether one is running and why the last one failed
 */
export function useCaseClaim(caseId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['moderation'] });
  const claim = useMutation({
    mutationFn: async () => claimCase(await requireClient(), caseId),
    onSettled: refresh,
  });
  const release = useMutation({
    mutationFn: async () => releaseCase(await requireClient(), caseId),
    onSettled: refresh,
  });
  return {
    claim: () => claim.mutate(),
    release: () => release.mutate(),
    isBusy: claim.isPending || release.isPending,
    failure: moderationFailureOf(claim.isError || release.isError, claim.error ?? release.error),
  };
}

/**
 * The picture of a picture case.
 *
 * @param caseId - the case's ID
 * @param isPicture - false for every other case, so nothing is asked
 * @returns the query: data is the picture, or null
 */
export function useCasePicture(caseId: string, isPicture: boolean) {
  return useQuery({
    queryKey: ['moderation', 'case-picture', caseId],
    enabled: isPicture,
    retry: false,
    queryFn: async () => fetchCasePicture(await requireClient(), caseId),
  });
}
