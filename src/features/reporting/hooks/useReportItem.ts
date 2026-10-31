/**
 * useReportItem: sends one report and keeps its result for the dialog (story S1-E10-01).
 *
 * Who calls it: ReportDialog. What it calls: api/reports.ts. It also answers whether someone is
 * signed in, because reporting needs an account (the public form is S1-E10-02).
 */
import { useMutation } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { trackEvent } from '@/lib/analytics/track';

import { ReportError, sendReport, type ReportFailure, type ReportRequest } from '../api/reports';

/**
 * The reason a send failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a ReportError
 */
function failureOf(hasFailed: boolean, error: unknown): ReportFailure | null {
  if (!hasFailed) return null;
  return error instanceof ReportError ? error.failure : 'unreachable';
}

/**
 * Follows one report.
 *
 * @returns send(), its state, the receipt, and whether someone is signed in
 */
export function useReportItem() {
  const { userId, isKnown } = useSession();
  const send = useMutation({
    mutationFn: async (request: ReportRequest) => sendReport(await requireClient(), request),
    // The reason and the kind of item only, never the item or the reporter (analytics catalogue).
    onSuccess: (_receipt, request) =>
      trackEvent('report_submitted', { reason: request.reason, item_type: request.itemType }),
  });
  return {
    isSignedIn: userId !== null,
    isSessionKnown: isKnown,
    send: (request: ReportRequest) => send.mutateAsync(request),
    isSending: send.isPending,
    failure: failureOf(send.isError, send.error),
    receipt: send.data ?? null,
    reset: () => send.reset(),
  };
}
