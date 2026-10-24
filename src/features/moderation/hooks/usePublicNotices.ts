/**
 * The public form's notices for staff: one case's notices, and the queue page's unmatched
 * notices and on-call alerts (story S1-E10-02).
 *
 * Who calls it: CaseNotices (case page) and PublicNoticesPanel (queue page). What it calls:
 * api/publicNotices.ts. Closing a notice reads every 'moderation' query again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  closeUnmatchedNotice,
  listCaseNotices,
  listOnCallAlerts,
  listUnmatchedNotices,
} from '../api/publicNotices';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the notices in one case.
 *
 * @param caseId - the case
 * @returns the notices (empty while loading or for a case with none)
 */
export function useCaseNotices(caseId: string) {
  const notices = useQuery({
    queryKey: ['moderation', 'case-notices', caseId],
    retry: false,
    queryFn: async () => listCaseNotices(await requireClient(), caseId),
  });
  return { notices: notices.data ?? [] };
}

/**
 * Follows the unmatched notices and the on-call alerts, and closes a notice.
 *
 * @returns both lists, a load failure if either read failed, close() and its state
 */
export function useQueueNotices() {
  const queryClient = useQueryClient();
  const unmatched = useQuery({
    queryKey: ['moderation', 'unmatched-notices'],
    retry: false,
    queryFn: async () => listUnmatchedNotices(await requireClient()),
  });
  const alerts = useQuery({
    queryKey: ['moderation', 'on-call-alerts'],
    retry: false,
    queryFn: async () => listOnCallAlerts(await requireClient()),
  });
  const close = useMutation({
    mutationFn: async ({ noticeId, note }: { noticeId: string; note: string }) =>
      closeUnmatchedNotice(await requireClient(), noticeId, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });
  return {
    unmatched: unmatched.data ?? [],
    alerts: alerts.data ?? [],
    // Shown on the panel, so a failed read never looks like "no notices".
    loadFailure:
      moderationFailureOf(unmatched.isError, unmatched.error) ??
      moderationFailureOf(alerts.isError, alerts.error),
    close: (noticeId: string, note: string) => close.mutateAsync({ noticeId, note }),
    isClosing: close.isPending,
    closeFailure: moderationFailureOf(close.isError, close.error),
  };
}
