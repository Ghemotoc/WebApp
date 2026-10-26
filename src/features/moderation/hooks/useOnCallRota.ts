/**
 * useOnCallRota: the on-call rota for removal orders, and adding or removing a shift (story
 * S1-E10-09; the founding team rotates on call, decided 16 Oct 2026, late evening).
 *
 * Who calls it: OnCallRotaPage (/staff/on-call). What it calls: api/removalOrders.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchOnCallRota,
  removeOnCallShift,
  setOnCallShift,
  type NewShift,
} from '../api/removalOrders';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the rota.
 *
 * @returns the rota, add() and remove() with their states
 */
export function useOnCallRota() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['moderation', 'on-call-rota'] });
  const rota = useQuery({
    queryKey: ['moderation', 'on-call-rota'],
    retry: false,
    queryFn: async () => fetchOnCallRota(await requireClient()),
  });
  const add = useMutation({
    mutationFn: async (shift: NewShift) => setOnCallShift(await requireClient(), shift),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (change: { shiftId: string; reason: string }) =>
      removeOnCallShift(await requireClient(), change.shiftId, change.reason),
    onSuccess: refresh,
  });
  return {
    rota: rota.data ?? null,
    isLoading: rota.isPending,
    loadFailure: moderationFailureOf(rota.isError, rota.error),
    add: (shift: NewShift) => add.mutateAsync(shift),
    isAdding: add.isPending,
    addFailure: moderationFailureOf(add.isError, add.error),
    remove: (shiftId: string, reason: string) => remove.mutateAsync({ shiftId, reason }),
    removeFailure: moderationFailureOf(remove.isError, remove.error),
  };
}
