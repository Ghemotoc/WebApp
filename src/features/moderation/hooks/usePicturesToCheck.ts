/**
 * usePicturesToCheck: the waiting pictures, the reject reasons and the decision (bundle ADMIN-2,
 * part e1b).
 *
 * Who calls it: PicturesToCheckPage. What it calls: api/picturesToCheck.ts. After a decision every
 * 'moderation' query is read again, so the picture leaves this list and the queue together.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  decidePicture,
  fetchPicturesToCheck,
  fetchRejectReasons,
  type PictureDecision,
} from '../api/picturesToCheck';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the list and sends decisions.
 *
 * @returns the pictures, the reasons, decide(decision), whether a decision is running, the case it
 *   is about, and why loading or the last decision failed
 */
export function usePicturesToCheck() {
  const queryClient = useQueryClient();
  const pictures = useQuery({
    queryKey: ['moderation', 'pictures-to-check'],
    retry: false,
    queryFn: async () => fetchPicturesToCheck(await requireClient()),
  });
  const reasons = useQuery({
    queryKey: ['moderation', 'picture-reject-reasons'],
    retry: false,
    queryFn: async () => fetchRejectReasons(await requireClient()),
  });
  const decision = useMutation({
    mutationFn: async (chosen: PictureDecision) => decidePicture(await requireClient(), chosen),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });
  return {
    pictures: pictures.data ?? [],
    reasons: reasons.data ?? [],
    isLoading: pictures.isPending,
    loadFailure: moderationFailureOf(pictures.isError, pictures.error),
    decide: (chosen: PictureDecision) => decision.mutate(chosen),
    isDeciding: decision.isPending,
    decidingCaseId: decision.variables?.caseId ?? null,
    decisionFailure: moderationFailureOf(decision.isError, decision.error),
  };
}
