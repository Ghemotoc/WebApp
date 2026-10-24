/**
 * useMyBlockedAccounts: the people the signed-in person blocks (story S1-E5-05).
 *
 * Who calls it: BlockedAccountsSection in Settings. What it calls: api/blocks.ts →
 * my_blocked_accounts().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyBlockedAccounts, type BlockedAccount } from '../api/blocks';

/**
 * Loads the list for the signed-in person.
 *
 * @returns accounts (empty while loading), isLoaded, loadFailed
 */
export function useMyBlockedAccounts() {
  const { userId } = useSession();
  const accounts = useQuery<BlockedAccount[]>({
    queryKey: ['my-blocked-accounts', userId],
    enabled: userId !== null,
    queryFn: async () => fetchMyBlockedAccounts(await requireClient()),
  });
  return {
    accounts: accounts.data ?? [],
    isLoaded: accounts.isSuccess,
    loadFailed: accounts.isError,
  };
}
