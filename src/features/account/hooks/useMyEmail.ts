/**
 * useMyEmail: the signed-in person's own email address, and asking to change it (story S1-E2-05,
 * added 25 Oct 2026).
 *
 * Who calls it: EmailSettingsSection. What it calls: api/emailAddress.ts (fetchMyEmail(),
 * requestEmailChange()). The address stays in this person's own cache only: the key carries
 * their user ID, and nothing here logs it (CLAUDE.md rule 12).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchMyEmail,
  requestEmailChange,
  type EmailChangeOutcome,
  type MyEmail,
} from '../api/emailAddress';

import { requireClient } from './useMyNames';

/** The cache key of the signed-in person's address. */
const emailKey = (userId: string | null) => ['my-email', userId];

/**
 * Follows the address and holds the change request.
 *
 * @returns the address, the waiting new one, load state, change(), the last outcome and whether
 *   the request failed for a reason the person can't fix (a broken connection)
 */
export function useMyEmail() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const myEmail = useQuery<MyEmail>({
    queryKey: emailKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyEmail(await requireClient()),
  });

  // After a request the address is read again, so the waiting new address shows.
  const change = useMutation<EmailChangeOutcome, Error, string>({
    mutationFn: async (newEmail) =>
      requestEmailChange(await requireClient(), myEmail.data?.email ?? null, newEmail),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailKey(userId) }),
  });

  return {
    email: myEmail.data?.email ?? null,
    pendingEmail: myEmail.data?.pendingEmail ?? null,
    isLoading: myEmail.isPending && userId !== null,
    loadFailed: myEmail.isError,
    change: (newEmail: string) => change.mutate(newEmail),
    resetChange: () => change.reset(),
    isChanging: change.isPending,
    outcome: change.data ?? null,
    changeFailed: change.isError,
  };
}
