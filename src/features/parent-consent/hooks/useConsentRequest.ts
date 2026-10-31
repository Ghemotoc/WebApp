/**
 * useConsentRequest: what a parent's consent link points to, and their answer (story S1-E2-03;
 * criteria 2, 3 and 5).
 *
 * Who calls it: ParentAnswerPage. What it calls: api/parentConsent.ts →
 * parental_consent_request(token) and POST /api/parent-consent/answer. Works signed out: the
 * link's token is the key. After an answer the request is read again (or, after a no, marked
 * refused), so the page shows where it now stands.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import type { ConsentAnswer } from '../../../schemas/parentConsent';
import {
  fetchConsentRequest,
  ParentConsentError,
  sendConsentAnswer,
  type ConsentRequestDetails,
} from '../api/parentConsent';

/** The cache key of one link's request. */
const consentRequestQueryKey = (token: string) => ['consent-request', token];

/**
 * Follows one consent link.
 *
 * @param token - the token from the link ("" when the link has none)
 * @returns the token, request (null for a link that doesn't work, undefined while loading), loadFailed,
 *   answer(), isAnswering, answerFailure and the decision just made
 */
export function useConsentRequest(token: string) {
  const queryClient = useQueryClient();
  const request = useQuery<ConsentRequestDetails | null>({
    queryKey: consentRequestQueryKey(token),
    enabled: token !== '',
    queryFn: async () => fetchConsentRequest(await requireClient(), token),
  });
  const answering = useMutation({
    mutationFn: (answer: ConsentAnswer) => sendConsentAnswer(answer),
    onSuccess: (_result, answer) => {
      // A no erases the account, so reading the link again would find nothing: mark it refused
      // here instead, so the page can say "Thank you". Any other answer is read again.
      if (answer.decision === 'refuse') {
        queryClient.setQueryData<ConsentRequestDetails | null>(
          consentRequestQueryKey(token),
          (shown) => (shown ? { ...shown, status: 'refused' } : shown),
        );
        return;
      }
      void queryClient.invalidateQueries({ queryKey: consentRequestQueryKey(token) });
    },
  });
  const failure = answering.error instanceof ParentConsentError ? answering.error.failure : null;
  return {
    token,
    request: token === '' ? null : request.data,
    loadFailed: request.isError,
    answer: (answer: ConsentAnswer) => answering.mutateAsync(answer),
    isAnswering: answering.isPending,
    answerFailure: answering.isError ? (failure ?? 'unavailable') : null,
    decision: answering.isSuccess ? answering.variables.decision : null,
  };
}
