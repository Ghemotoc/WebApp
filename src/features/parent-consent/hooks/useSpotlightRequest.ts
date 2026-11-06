/**
 * useSpotlightRequest: what a parent's suggestions link points to, and their answer (story
 * S1-E2-03b, bundle LOOK-4c).
 *
 * Who calls it: ParentSpotlightPage. What it calls: api/parentConsent.ts →
 * parental_spotlight_request(token) and POST /api/parent-consent/spotlight-answer. Works signed
 * out: the link's token is the key. After an answer the link is read again, so the page shows
 * where the yes now stands.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import type { SpotlightAnswer } from '../../../schemas/parentConsent';
import {
  fetchSpotlightRequest,
  ParentConsentError,
  sendSpotlightAnswer,
  type SpotlightRequestDetails,
} from '../api/parentConsent';

/** The cache key of one link's details. */
const spotlightRequestQueryKey = (token: string) => ['spotlight-request', token];

/**
 * Follows one suggestions link.
 *
 * @param token - the token from the link ("" when the link has none)
 * @returns the token, request (null for a link that doesn't work, undefined while loading),
 *   loadFailed, answer(), isAnswering, answerFailure and the decision just made
 */
export function useSpotlightRequest(token: string) {
  const queryClient = useQueryClient();
  const request = useQuery<SpotlightRequestDetails | null>({
    queryKey: spotlightRequestQueryKey(token),
    enabled: token !== '',
    queryFn: async () => fetchSpotlightRequest(await requireClient(), token),
  });
  const answering = useMutation({
    mutationFn: (answer: SpotlightAnswer) => sendSpotlightAnswer(answer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spotlightRequestQueryKey(token) }),
  });
  const failure = answering.error instanceof ParentConsentError ? answering.error.failure : null;
  return {
    token,
    request: token === '' ? null : request.data,
    loadFailed: request.isError,
    answer: (answer: SpotlightAnswer) => answering.mutateAsync(answer),
    isAnswering: answering.isPending,
    answerFailure: answering.isError ? (failure ?? 'unavailable') : null,
    decision: answering.isSuccess ? answering.variables.decision : null,
  };
}
