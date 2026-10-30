/**
 * useAppeal: sends an appeal against one decision and refreshes the person's statements (story
 * S1-E10-07; DSA art. 20).
 *
 * Who calls it: AppealSection. What it calls: api/statements.ts submitAppeal() →
 * submit_appeal() (…_s1_e10_07_appeals.sql).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { AppealError, submitAppeal, type AppealFailure } from '../api/statements';

/**
 * Keeps one appeal's send.
 *
 * @param statementReference - the decision's statement reference
 * @returns send(explanation), the new reference, whether it is sending, and why it failed
 */
export function useAppeal(statementReference: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (explanation: string) =>
      submitAppeal(await requireClient(), statementReference, explanation),
    // The statement now shows the open appeal.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-statements'] }),
  });
  const error = mutation.error;
  let failure: AppealFailure | null = null;
  if (error !== null) failure = error instanceof AppealError ? error.failure : 'unreachable';
  return {
    send: (explanation: string) => mutation.mutate(explanation),
    reference: mutation.data ?? null,
    isSending: mutation.isPending,
    failure,
    waitMinutes: error instanceof AppealError ? error.waitMinutes : null,
  };
}
