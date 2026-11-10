/**
 * useHubCalls: the calls for submissions still open, for the Writers' hub (bundle GAPS-12d).
 *
 * Who calls it: HubCalls. What it calls: api/hubCalls.ts, and useSession so a visitor who isn't
 * signed in never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchHubCalls, type SubmissionCall } from '../api/hubCalls';

/** The first part of the cache key, shared so a staff change can refresh every writer's list. */
export const hubCallsKey = ['hub-calls'];

/**
 * Follows the open calls, soonest closing first.
 *
 * @returns calls (empty while loading, signed out or when there are none) and loadFailed
 */
export function useHubCalls(): { calls: SubmissionCall[]; loadFailed: boolean } {
  const { userId } = useSession();
  // One cache entry per person, because paid calls depend on their age group.
  const calls = useQuery<SubmissionCall[]>({
    queryKey: [...hubCallsKey, userId],
    enabled: userId !== null,
    queryFn: async () => fetchHubCalls(await requireClient()),
  });
  return { calls: calls.data ?? [], loadFailed: calls.isError };
}
