/**
 * useCaseStatements and useDecisionEmails: the statements of reasons stored with a case, and the
 * decision emails to people who used the public form (story S1-E10-04; DSA art. 17 and art.
 * 16(5)).
 *
 * Who calls it: CaseStatements and CasePage (statements, and sending the emails right after a
 * decision), PublicNoticesPanel (the queue's "Send waiting decision emails").
 * What it calls: api/caseStatements.ts. Sending reads every 'moderation' query again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  countWaitingDecisionEmails,
  listCaseStatements,
  sendDecisionEmails,
} from '../api/caseStatements';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Sends the decision emails a decision just made due (DSA art. 16(5); Regulation (EU) 2021/784
 * art. 3(6) for an order's authority). A failure leaves them waiting, and the queue shows "Send
 * waiting decision emails" until they leave, so the decision itself still counts as saved.
 * Who calls it: useCase (after a decision) and useRemovalOrder (after Emergency disable).
 */
export async function sendDueEmails(): Promise<void> {
  try {
    await sendDecisionEmails(await requireClient());
  } catch {
    // Still waiting: the queue page's button sends them (DecisionEmailsPanel).
  }
}

/**
 * Follows the statements stored with one case.
 *
 * @param caseId - the case
 * @returns the statements (empty while loading or before a decision) and a load failure
 */
export function useCaseStatements(caseId: string) {
  const statements = useQuery({
    queryKey: ['moderation', 'case-statements', caseId],
    retry: false,
    queryFn: async () => listCaseStatements(await requireClient(), caseId),
  });
  return {
    statements: statements.data ?? [],
    loadFailure: moderationFailureOf(statements.isError, statements.error),
  };
}

/**
 * Follows how many decision emails wait, and sends them.
 *
 * @returns the waiting count, send() with its result and failure
 */
export function useDecisionEmails() {
  const queryClient = useQueryClient();
  const waiting = useQuery({
    queryKey: ['moderation', 'decision-emails-waiting'],
    retry: false,
    queryFn: async () => countWaitingDecisionEmails(await requireClient()),
  });
  const send = useMutation({
    mutationFn: async () => sendDecisionEmails(await requireClient()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['moderation', 'decision-emails-waiting'] }),
  });
  return {
    waitingCount: waiting.data ?? 0,
    send: () => send.mutateAsync(),
    isSending: send.isPending,
    result: send.data ?? null,
    sendFailure: moderationFailureOf(send.isError, send.error),
  };
}
