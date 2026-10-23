/**
 * useSanctions: the reported account's sanctions on a case page, and the actions a moderator
 * takes from there: lift a sanction, pause a reporter, restore the item (story S1-E10-06).
 *
 * Who calls it: CasePage (through AccountSanctions, CaseReports and ModeratedItemNotice).
 * What it calls: api/sanctions.ts. After any action the case's queries are read again (every key
 * starts with 'moderation'), so the page shows what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  findModeratedItem,
  liftSanction,
  listAccountSanctions,
  pauseReporting,
  restoreItem,
} from '../api/sanctions';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows one account's sanctions and the case's moderated item.
 *
 * @param caseId - the case
 * @param reportedUserId - the account the case is about (null until the case is known)
 * @returns the sanctions, the moderated item, and lift(), pause() and restore() with their states
 */
export function useSanctions(caseId: string, reportedUserId: string | null) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['moderation'] });
  const sanctions = useQuery({
    queryKey: ['moderation', 'sanctions', reportedUserId],
    enabled: reportedUserId !== null,
    retry: false,
    queryFn: async () => listAccountSanctions(await requireClient(), reportedUserId ?? ''),
  });
  const moderatedItem = useQuery({
    queryKey: ['moderation', 'moderated-item', caseId],
    retry: false,
    queryFn: async () => findModeratedItem(await requireClient(), caseId),
  });
  const lift = useMutation({
    mutationFn: async (change: { sanctionId: string; reason: string }) =>
      liftSanction(await requireClient(), change.sanctionId, change.reason),
    onSuccess: refresh,
  });
  const pause = useMutation({
    mutationFn: async (change: { reporterHandle: string; note: string }) =>
      pauseReporting(await requireClient(), change.reporterHandle, caseId, change.note),
    onSuccess: refresh,
  });
  const restore = useMutation({
    mutationFn: async (change: { itemId: string; reason: string }) =>
      restoreItem(await requireClient(), change.itemId, change.reason),
    onSuccess: refresh,
  });

  return {
    sanctions: sanctions.data ?? [],
    moderatedItem: moderatedItem.data ?? null,
    lift: (sanctionId: string, reason: string) => lift.mutateAsync({ sanctionId, reason }),
    liftFailure: moderationFailureOf(lift.isError, lift.error),
    pause: (reporterHandle: string, note: string) => pause.mutateAsync({ reporterHandle, note }),
    pauseFailure: moderationFailureOf(pause.isError, pause.error),
    hasPaused: pause.isSuccess,
    restore: (itemId: string, reason: string) => restore.mutateAsync({ itemId, reason }),
    restoreFailure: moderationFailureOf(restore.isError, restore.error),
    isBusy: lift.isPending || pause.isPending || restore.isPending,
  };
}
