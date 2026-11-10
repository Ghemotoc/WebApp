/**
 * The hooks behind Delete my account (story S1-E13-03).
 *
 * Who calls them: DeleteAccountSection, ConfirmLogIn, AccountClosingGate and ClosingAccountPage.
 * What they call: api/accountDeletion.ts, and features/auth for logging in again and logging out.
 * After a request or a cancel every cached answer is read again, because the whole app changes:
 * a closing account sees only the closing page, a kept one sees everything again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { signOutOtherDevices } from '@/features/auth/api/signIn';
import {
  signInWithPasskey,
  startSocialLogIn,
  type SocialProvider,
} from '@/features/auth/api/socialSignIn';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  cancelAccountDeletion,
  confirmWithPassword,
  fetchMyAccountDeletion,
  requestAccountDeletion,
  type AccountDeletionState,
  type DeletionRequestOutcome,
} from '../api/accountDeletion';

/** The cache key of where the account stands, per person. */
export function accountDeletionKey(userId: string | null) {
  return ['account-deletion', userId] as const;
}

/**
 * Where the signed-in person's account stands.
 *
 * @returns TanStack Query's result; disabled while signed out
 */
export function useMyAccountDeletion() {
  const { userId } = useSession();
  return useQuery<AccountDeletionState>({
    queryKey: accountDeletionKey(userId),
    enabled: userId !== null,
    retry: false,
    queryFn: async () => fetchMyAccountDeletion(await requireClient()),
  });
}

/**
 * "Delete account": closes the account, then logs out the person's other devices.
 *
 * @returns TanStack Query's mutation; its data is the outcome
 */
export function useRequestAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation<DeletionRequestOutcome>({
    mutationFn: async () => {
      const client = await requireClient();
      const outcome = await requestAccountDeletion(client);
      // The account is closed: nobody stays signed in to it elsewhere (this device stays, so the
      // person sees the closing page and can still cancel).
      if (outcome.outcome === 'closing') await signOutOtherDevices(client);
      return outcome;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/**
 * "Keep account".
 *
 * @returns TanStack Query's mutation
 */
export function useCancelAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => cancelAccountDeletion(await requireClient()),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** How the person logs in again: their password, a passkey or a connected provider. */
export type ConfirmWay =
  | { way: 'password'; password: string }
  | { way: 'passkey' }
  | { way: 'provider'; provider: SocialProvider };

/** What logging in again answered: done, or a key under confirm.failures in the locale file. */
export type ConfirmOutcome = 'confirmed' | 'leaving' | 'wrongPassword' | 'cancelled' | 'failed';

/**
 * Runs one way of logging in again.
 *
 * @param choice - the way and what it needs
 * @returns the outcome; 'leaving' when the browser goes to the provider
 */
async function logInAgain(choice: ConfirmWay): Promise<ConfirmOutcome> {
  const client = await requireClient();
  if (choice.way === 'provider') {
    // The provider sends the person back to Settings › Delete account (mode=confirm).
    await startSocialLogIn(client, choice.provider, 'confirm');
    return 'leaving';
  }
  if (choice.way === 'passkey') {
    const answer = await signInWithPasskey(client);
    if (answer === 'signed_in') return 'confirmed';
    return answer === 'cancelled' ? 'cancelled' : 'failed';
  }
  const result = await confirmWithPassword(client, choice.password);
  if (result.kind === 'signed_in') return 'confirmed';
  return result.kind === 'wrong_details' ? 'wrongPassword' : 'failed';
}

/**
 * "Log in again to confirm": after a log-in the account's state is read again, so the panel
 * knows "Delete account" can be pressed.
 *
 * @returns TanStack Query's mutation; its data is the outcome
 */
export function useConfirmLogIn() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return useMutation<ConfirmOutcome, Error, ConfirmWay>({
    mutationFn: logInAgain,
    onSuccess: (outcome) => {
      if (outcome === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: accountDeletionKey(userId) });
      }
    },
  });
}
