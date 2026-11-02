/**
 * A writer's rank as a React hook (story S1-E8-09).
 *
 * Who calls it: RankChip in the profile header, RankPanel in the profile's side column and the
 * avatar's sticker; all three share one read through the query cache. What it calls:
 * api/writerRanks.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchProfileRank } from '../api/writerRanks';

/** The query key every rank read starts with. */
export const ranksQueryKey = 'writer-ranks';

/**
 * A writer's rank on their profile.
 *
 * @param handle - the profile's username
 * @returns the query: data is the rank, or null when there is none to show
 */
export function useProfileRank(handle: string) {
  return useQuery({
    queryKey: [ranksQueryKey, 'profile', handle],
    queryFn: async () => fetchProfileRank(await requireClient(), handle),
  });
}
