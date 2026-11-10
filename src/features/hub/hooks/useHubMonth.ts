/**
 * useHubMonth: the signed-in writer's writing month for the Writers' hub (bundle GAPS-12f).
 *
 * Who calls it: HubMonth. What it calls: api/hubMonth.ts, and useSession so a visitor who isn't
 * signed in never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchHubMonth, type HubMonth } from '../api/hubMonth';

/**
 * Follows the month for the signed-in writer.
 *
 * @returns month (null while loading, signed out or after a failure) and loadFailed
 */
export function useHubMonth(): { month: HubMonth | null; loadFailed: boolean } {
  const { userId } = useSession();
  // One cache entry per person: the month is about the caller only.
  const month = useQuery<HubMonth>({
    queryKey: ['hub-month', userId],
    enabled: userId !== null,
    queryFn: async () => fetchHubMonth(await requireClient()),
  });
  return { month: month.data ?? null, loadFailed: month.isError };
}
