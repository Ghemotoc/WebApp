/**
 * useCase: one case's page: the case, its reports, its decisions and the decision form's send
 * (story S1-E10-03a).
 *
 * Who calls it: CasePage. What it calls: api/moderationQueue.ts → admin_moderation_queue(case_id),
 * admin_case_reports(), admin_case_actions() and admin_decide_case(). After a decision everything
 * is read again, so the page shows what the database holds, and the decision emails to anyone
 * who used the public form are sent at once (S1-E10-04; api/caseStatements.ts).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  decideCase,
  getCase,
  listCaseActions,
  listCaseReports,
  type Decision,
} from '../api/moderationQueue';

import { sendDueEmails } from './useCaseStatements';
import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows one case.
 *
 * @param caseId - the case's ID from the address
 * @returns the case (null when none is visible), its reports and decisions, and decide()
 */
export function useCase(caseId: string) {
  const queryClient = useQueryClient();
  const theCase = useQuery({
    queryKey: ['moderation', 'case', caseId],
    retry: false,
    queryFn: async () => getCase(await requireClient(), caseId),
  });
  const reports = useQuery({
    queryKey: ['moderation', 'case-reports', caseId],
    retry: false,
    queryFn: async () => listCaseReports(await requireClient(), caseId),
  });
  const actions = useQuery({
    queryKey: ['moderation', 'case-actions', caseId],
    retry: false,
    queryFn: async () => listCaseActions(await requireClient(), caseId),
  });
  const decide = useMutation({
    mutationFn: async (decision: Decision) => decideCase(await requireClient(), caseId, decision),
    // The case, its decisions and the queue all change with a decision: every key starts with
    // 'moderation', so one call refreshes them all.
    onSuccess: async () => {
      await sendDueEmails();
      await queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });

  return {
    theCase: theCase.data ?? null,
    isLoading: theCase.isPending,
    loadFailure: moderationFailureOf(theCase.isError, theCase.error),
    reports: reports.data ?? [],
    actions: actions.data ?? [],
    decide: (decision: Decision) => decide.mutateAsync(decision),
    isDeciding: decide.isPending,
    decideFailure: moderationFailureOf(decide.isError, decide.error),
    hasDecided: decide.isSuccess,
  };
}
