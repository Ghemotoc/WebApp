/**
 * A profile's reading level as a React hook (bundle G7a).
 *
 * Who calls it: ReaderLevelPill in the profile header and ReaderLevelPanel in the side column;
 * both share one read through the query cache. Settings › Privacy reads it again after the
 * switch changes (readerLevelQueryKey). What it calls: api/readerLevel.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchProfileReaderLevel } from '../api/readerLevel';

/** The query key every reading level read starts with. */
export const readerLevelQueryKey = 'reader-levels';

/**
 * A profile's reading level.
 *
 * @param handle - the profile's username
 * @returns the query: data is the level, or null when there is none to show
 */
export function useProfileReaderLevel(handle: string) {
  return useQuery({
    queryKey: [readerLevelQueryKey, handle],
    queryFn: async () => fetchProfileReaderLevel(await requireClient(), handle),
  });
}
