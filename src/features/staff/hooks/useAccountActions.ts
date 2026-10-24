/**
 * useAccountActions: what staff do on the account page (story S1-E11-02): warn, suspend, ban,
 * reset the pen name, sign out everywhere, approve a username, and lift a sanction.
 *
 * Who calls it: AccountPage (through AccountActions and the sanctions panel). What it calls:
 * api/userManagement.ts actOnAccount() and the moderation feature's liftSanction() (S1-E10-06).
 * After every action the whole page is read again, so it shows what the database now holds.
 */
import { useMutation } from '@tanstack/react-query';

import { liftSanction } from '@/features/moderation/api/sanctions';
import { moderationFailureOf } from '@/features/moderation/hooks/useModerationQueue';

import { actOnAccount, type AccountAction } from '../api/userManagement';

import { requireStaffClient } from './requireStaffClient';
import { userFailureOf } from './useUserLookup';

/**
 * Follows the actions on one account.
 *
 * @param userId - the account
 * @param refresh - reads the account page again
 * @returns act(action), the last action done, its failure, lift(), its failure, and isBusy
 */
export function useAccountActions(userId: string, refresh: () => Promise<unknown>) {
  const action = useMutation({
    mutationFn: async (wanted: AccountAction) =>
      actOnAccount(await requireStaffClient(), userId, wanted),
    onSuccess: refresh,
  });
  const lift = useMutation({
    mutationFn: async (change: { sanctionId: string; reason: string }) =>
      liftSanction(await requireStaffClient(), change.sanctionId, change.reason),
    onSuccess: refresh,
  });

  return {
    act: (wanted: AccountAction) => action.mutateAsync(wanted),
    doneKind: action.isSuccess ? action.variables.kind : null,
    actFailure: userFailureOf(action.error),
    lift: (sanctionId: string, reason: string) => lift.mutateAsync({ sanctionId, reason }),
    liftFailure: moderationFailureOf(lift.isError, lift.error),
    isBusy: action.isPending || lift.isPending,
  };
}
