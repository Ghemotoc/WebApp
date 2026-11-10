/**
 * useHubWeek: the signed-in writer's last 7 days, for the Writers' hub (bundle GAPS-12b).
 *
 * Who calls it: HubWeek. What it calls: api/hubWeek.ts, and useSession so a visitor who isn't
 * signed in never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchHubWeek, type HubWeek } from '../api/hubWeek';

/**
 * Follows the week's numbers for the signed-in writer.
 *
 * @returns week (null while loading, signed out or after a failure) and loadFailed
 */
export function useHubWeek(): { week: HubWeek | null; loadFailed: boolean } {
  const { userId } = useSession();
  // One cache entry per person: the numbers are about the caller only.
  const week = useQuery<HubWeek>({
    queryKey: ['hub-week', userId],
    enabled: userId !== null,
    queryFn: async () => fetchHubWeek(await requireClient()),
  });
  return { week: week.data ?? null, loadFailed: week.isError };
}
