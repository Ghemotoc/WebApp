/**
 * useRemovalOrder: one removal order's timeline and "Emergency disable", and acknowledging an
 * on-call alert (story S1-E10-09; Regulation (EU) 2021/784 art. 3(3): one hour).
 *
 * Who calls it: RemovalOrderPanel (case page) and PublicNoticesPanel (acknowledge, on the queue).
 * What it calls: api/removalOrders.ts. After a change every 'moderation' query is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  acknowledgeAlert,
  emergencyDisable,
  fetchOrderTimeline,
  type EmergencyDisable,
} from '../api/removalOrders';

import { sendDueEmails } from './useCaseStatements';
import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows one order.
 *
 * @param caseId - the order's case
 * @param isOrder - false for any other case, so nothing is read
 * @returns the timeline, disable() and its state
 */
export function useRemovalOrder(caseId: string, isOrder: boolean) {
  const queryClient = useQueryClient();
  const timeline = useQuery({
    queryKey: ['moderation', 'order-timeline', caseId],
    enabled: isOrder,
    retry: false,
    queryFn: async () => fetchOrderTimeline(await requireClient(), caseId),
  });
  const disable = useMutation({
    mutationFn: async (request: EmergencyDisable) =>
      emergencyDisable(await requireClient(), caseId, request),
    // The authority is told the time of the take-down at once (TCO art. 3(6)).
    onSuccess: async () => {
      await sendDueEmails();
      await queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
  return {
    timeline: timeline.data ?? null,
    disable: (request: EmergencyDisable) => disable.mutateAsync(request),
    isDisabling: disable.isPending,
    hasDisabled: disable.isSuccess,
    disableFailure: moderationFailureOf(disable.isError, disable.error),
  };
}

/**
 * Acknowledges an on-call alert, which stops its escalation.
 *
 * @returns acknowledge(), its state and failure
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const acknowledge = useMutation({
    mutationFn: async (alertId: string) => acknowledgeAlert(await requireClient(), alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });
  return {
    acknowledge: (alertId: string) => acknowledge.mutateAsync(alertId),
    isAcknowledging: acknowledge.isPending,
    acknowledgeFailure: moderationFailureOf(acknowledge.isError, acknowledge.error),
  };
}
