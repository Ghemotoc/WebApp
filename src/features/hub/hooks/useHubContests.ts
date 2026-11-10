/**
 * useHubContests: the contests the signed-in writer can enter today, for the Writers' hub
 * (bundle G9 WRITING, part a).
 *
 * Who calls it: HubContests. What it calls: api/hubContests.ts, and useSession so a visitor who
 * isn't signed in never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchHubContests, type HubContest } from '../api/hubContests';

/**
 * Follows the open contests for the signed-in writer.
 *
 * @returns contests (empty while loading or signed out), isLoaded and loadFailed
 */
export function useHubContests(): {
  contests: HubContest[];
  isLoaded: boolean;
  loadFailed: boolean;
} {
  const { userId } = useSession();
  // One cache entry per person, because the list depends on their age group and market.
  const contests = useQuery<HubContest[]>({
    queryKey: ['hub-contests', userId],
    enabled: userId !== null,
    queryFn: async () => fetchHubContests(await requireClient()),
  });
  return {
    contests: contests.data ?? [],
    isLoaded: contests.isSuccess,
    loadFailed: contests.isError,
  };
}
