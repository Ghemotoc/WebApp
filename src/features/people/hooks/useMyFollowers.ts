/**
 * useMyFollowers: the signed-in writer's own followers (story S1-E6-05; Q50: the list is the
 * writer's only).
 *
 * Who calls it: FollowersDialog, only on one's own profile and only once it opens.
 * What it calls: api/follows.ts → my_followers().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchMyFollowers, type Follower } from '../api/follows';

/**
 * Loads the list.
 *
 * @param isOpen - load only while the dialog is open
 * @returns followers (empty while loading), isLoaded, loadFailed
 */
export function useMyFollowers(isOpen: boolean) {
  const followers = useQuery<Follower[]>({
    queryKey: ['my-followers'],
    enabled: isOpen,
    queryFn: async () => fetchMyFollowers(await requireClient()),
  });
  return {
    followers: followers.data ?? [],
    isLoaded: followers.isSuccess,
    loadFailed: followers.isError,
  };
}
