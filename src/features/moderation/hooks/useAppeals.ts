/**
 * useAppeals: the staff appeals list with its status filter, deciding one (story S1-E10-07) and
 * the owner's review of a same-moderator decision (QA-7).
 *
 * Who calls it: AppealsPage. What it calls: api/appeals.ts. After a decision every 'moderation'
 * query is read again, so the list and any case page show what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  decideAppeal,
  listAppeals,
  markAppealReviewed,
  type AppealDecision,
  type AppealStatus,
} from '../api/appeals';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the list.
 *
 * @returns the filter, the appeals, the load state, decide(), markReviewed() and their states
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
  const review = useMutation({
    mutationFn: async (appealId: string) => markAppealReviewed(await requireClient(), appealId),
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
    markReviewed: (appealId: string) => review.mutate(appealId),
    isMarking: review.isPending,
    markFailure: moderationFailureOf(review.isError, review.error),
  };
}
