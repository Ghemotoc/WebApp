/**
 * useFollowersLine: the signed-in writer's followers line for one time range (bundle CALM-7b).
 *
 * Who calls it: FollowersChart on the Write page. What it calls: api/followersLine.ts →
 * writer_followers_line(). Signed out, it never asks the database. Changing the range keeps the
 * last line on screen until the new one arrives, so the card doesn't jump.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchFollowersLine, type FollowersPoint, type FollowersRange } from '../api/followersLine';

/**
 * Follows the line for a range.
 *
 * @param range - 7, 30, 90 or 365 days
 * @returns points (null while loading or signed out) and loadFailed
 */
export function useFollowersLine(range: FollowersRange) {
  const { userId } = useSession();
  const line = useQuery<FollowersPoint[]>({
    // The range is in the key, so each range is fetched and kept on its own.
    queryKey: ['followers-line', userId, range],
    enabled: userId !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => fetchFollowersLine(await requireClient(), range),
  });
  return { points: line.data ?? null, loadFailed: line.isError };
}
