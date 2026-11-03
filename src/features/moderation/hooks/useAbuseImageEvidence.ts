/**
 * useAbuseImageEvidence: the evidence about a suspected child sexual abuse image on its
 * safeguarding case, and the three things a safeguarding moderator can do with it (bundle
 * ADMIN-2, part e2b; Robert's brief of 2 Nov 2026, section 4).
 *
 * Who calls it: AbuseImageEvidencePanel (case page). What it calls: api/abuseImageEvidence.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  changeEvidence,
  fetchAbuseImageEvidence,
  type EvidenceChange,
} from '../api/abuseImageEvidence';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the evidence of one case.
 *
 * @param caseId - the case
 * @returns the evidence (null when the case has none), change() and their states
 */
export function useAbuseImageEvidence(caseId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['moderation', 'abuse-image-evidence', caseId];
  // Step 1: the evidence; a case without any answers null and the panel shows nothing.
  const evidence = useQuery({
    queryKey,
    retry: false,
    queryFn: async () => fetchAbuseImageEvidence(await requireClient(), caseId),
  });
  // Step 2: each change reads the evidence again, so the page shows what the database kept.
  const change = useMutation({
    mutationFn: async (wanted: EvidenceChange) => changeEvidence(await requireClient(), wanted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  return {
    evidence: evidence.data ?? null,
    failure: moderationFailureOf(evidence.isError, evidence.error),
    change: (wanted: EvidenceChange) => change.mutateAsync(wanted),
    isChanging: change.isPending,
    changeFailure: moderationFailureOf(change.isError, change.error),
  };
}
