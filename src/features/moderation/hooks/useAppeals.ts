/**
 * useAppeals: the staff appeals list with its status filter, and deciding one (story S1-E10-07).
 *
 * Who calls it: AppealsPage. What it calls: api/appeals.ts. After a decision every 'moderation'
 * query is read again, so the list and any case page show what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { decideAppeal, listAppeals, type AppealDecision, type AppealStatus } from '../api/appeals';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the list.
 *
 * @returns the filter, the appeals, the load state, decide() and the decision's state
 */
export function useAppeals() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AppealStatus | ''>('open');
  const appeals = useQuery({
    queryKey: ['moderation', 'appeals', status],
    retry: false,
    queryFn: async () => listAppeals(await requireClient(), status),
  });
  const decide = useMutation({
    mutationFn: async ({ appealId, decision }: { appealId: string; decision: AppealDecision }) =>
      decideAppeal(await requireClient(), appealId, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });
  return {
    status,
    setStatus,
    appeals: appeals.data ?? [],
    isLoading: appeals.isPending,
    loadFailure: moderationFailureOf(appeals.isError, appeals.error),
    decide: (appealId: string, decision: AppealDecision) =>
      decide.mutateAsync({ appealId, decision }),
    isDeciding: decide.isPending,
    decideFailure: moderationFailureOf(decide.isError, decide.error),
  };
}
