/**
 * useMyParentConsent: the signed-in writer's parental consent, and sending the email to a parent
 * or guardian (story S1-E2-03).
 *
 * Who calls it: ParentConsentNotice and ParentConsentPage.
 * What it calls: api/parentConsent.ts → my_parental_consent() and POST /api/parent-consent/request.
 * Signed out, it reads nothing. After an email leaves, the consent is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import type { ConsentRequest } from '../../../schemas/parentConsent';
import {
  fetchMyParentConsent,
  myParentConsentQueryKey,
  ParentConsentError,
  sendConsentRequest,
  type MyParentConsent,
} from '../api/parentConsent';

/**
 * Follows the writer's consent.
 *
 * @returns consent (null signed out or without a profile, undefined while loading), loadFailed,
 *   send(request), isSending, sendFailure and wasSent
 */
export function useMyParentConsent() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const consent = useQuery<MyParentConsent | null>({
    queryKey: myParentConsentQueryKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyParentConsent(await requireClient()),
  });
  const sending = useMutation({
    mutationFn: async (request: ConsentRequest) =>
      sendConsentRequest(await requireClient(), request),
    // The page then shows "We emailed your parent or guardian" with the new address.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myParentConsentQueryKey(userId) }),
  });
  const failure = sending.error instanceof ParentConsentError ? sending.error.failure : null;
  return {
    consent: userId === null ? null : consent.data,
    loadFailed: consent.isError,
    send: (request: ConsentRequest) => sending.mutateAsync(request),
    isSending: sending.isPending,
    sendFailure: sending.isError ? (failure ?? 'unavailable') : null,
    wasSent: sending.isSuccess,
  };
}
