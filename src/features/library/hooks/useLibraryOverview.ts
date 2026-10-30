/**
 * useLibraryOverview and useMyFollows: the Library page's reads (story S1-E4-03; board 3.7).
 *
 * Who calls them: LibraryPage and its sections. What they call: api/library.ts → my_library()
 * and my_follows(). Both wait for the session and read nothing for a signed-out visitor, who
 * sees the "log in" card instead.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchLibraryOverview,
  fetchMyFollows,
  type LibraryOverview,
  type MyFollows,
} from '../api/library';

/** The first part of the library's cache keys, so a change of shelf refreshes them all. */
export const libraryQueryKey = 'library';

/**
 * Reads the shelf counts, the stories to continue and the places.
 *
 * @returns overview (null while loading), isLoaded, loadFailed
 */
export function useLibraryOverview() {
  const { userId, isKnown } = useSession();
  const overview = useQuery<LibraryOverview>({
    queryKey: [libraryQueryKey, 'overview', userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchLibraryOverview(await requireClient()),
  });
  return {
    overview: overview.data ?? null,
    isLoaded: overview.isSuccess,
    loadFailed: overview.isError,
  };
}

/**
 * Reads the writers and stories the reader follows.
 *
 * @returns follows (null while loading), loadFailed
 */
export function useMyFollows() {
  const { userId, isKnown } = useSession();
  const follows = useQuery<MyFollows>({
    // The follow buttons' own key starts with 'follow-state'; this list refreshes on its own.
    queryKey: [libraryQueryKey, 'follows', userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchMyFollows(await requireClient()),
  });
  return { follows: follows.data ?? null, loadFailed: follows.isError };
}
