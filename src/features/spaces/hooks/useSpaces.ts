/**
 * The space reads and changes as React hooks (bundle FORUMS-2, part a; story S1-E8-06).
 *
 * Who calls it: the components in ../components. What it calls: ../api/spaces.ts.
 * Every key sits under the forums' key, so a new thread or reply in a space refreshes the space's
 * numbers too, and every space change refreshes the forum reads (a space's thread list and its
 * "Reply" box depend on membership).
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import {
  SpaceError,
  createSpace,
  decideJoinRequest,
  fetchJoinRequests,
  fetchMyAgeGroup,
  fetchSpace,
  fetchSpaceList,
  joinSpace,
  leaveSpace,
  updateSpace,
  type SpaceListPage,
  type SpaceSettings,
} from '../api/spaces';

/** The cache key every space read sits under. */
export const spacesQueryKey = [forumsQueryKey, 'spaces'];

/**
 * Turns whatever a change threw into a SpaceError, so the screen always has plain words.
 *
 * @param error - the mutation's error, or null
 * @returns the SpaceError, or null when nothing went wrong
 */
export function spaceFailureOf(error: Error | null): SpaceError | null {
  if (error === null) return null;
  return error instanceof SpaceError ? error : new SpaceError('unreachable');
}

/**
 * Reads the spaces the caller may see, a page at a time.
 *
 * @param pageSize - how many a page holds (4 for the forum index's card, 20 for /spaces)
 * @returns the spaces so far (null while loading), the total, hasMore, showMore() and loadFailed
 */
export function useSpaceList(pageSize: number) {
  // Which spaces show depends on who is reading (the age rules), so signing in reads again.
  const { userId } = useSession();
  const list = useInfiniteQuery({
    queryKey: [...spacesQueryKey, 'list', pageSize, userId],
    queryFn: async ({ pageParam }: { pageParam: number }) =>
      fetchSpaceList(await requireClient(), pageParam, pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage: SpaceListPage, pages: SpaceListPage[]) =>
      lastPage.hasMore ? pages.length * pageSize : null,
  });
  const pages = list.data?.pages ?? null;
  return {
    spaces: pages === null ? null : pages.flatMap((page) => page.spaces),
    total: pages?.[0]?.total ?? 0,
    hasMore: list.hasNextPage,
    showMore: () => void list.fetchNextPage(),
    isLoadingMore: list.isFetchingNextPage,
    loadFailed: list.isError,
  };
}

/**
 * Reads one space.
 *
 * @param slug - the space's address
 * @returns the query: data is the space, null when hidden or missing, undefined while loading
 */
export function useSpace(slug: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...spacesQueryKey, 'one', slug, userId],
    queryFn: async () => fetchSpace(await requireClient(), slug),
  });
}

/**
 * Reads which spaces the signed-in person would start.
 *
 * @returns the query: 'under_16', '16_plus' or null
 */
export function useMyAgeGroup() {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...spacesQueryKey, 'my-age-group', userId],
    queryFn: async () => fetchMyAgeGroup(await requireClient()),
    enabled: userId !== null,
  });
}

/**
 * Refreshes every forum and space read after a change.
 *
 * @returns the function to call on success
 */
function useRefreshSpaces() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
}

/**
 * Starts a space.
 *
 * @returns run(settings) → the new address, the failure and isRunning
 */
export function useCreateSpace() {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (settings: SpaceSettings) => createSpace(await requireClient(), settings),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Changes a space's settings (its owner).
 *
 * @param slug - the space's address
 * @returns run(settings), the failure and isRunning
 */
export function useUpdateSpace(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (settings: SpaceSettings) =>
      updateSpace(await requireClient(), slug, settings),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Joins or leaves a space (leaving also takes back a request).
 *
 * @param slug - the space's address
 * @returns join(), leave(), the failure and isRunning
 */
export function useMembership(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (wanted: 'join' | 'leave') => {
      const client = await requireClient();
      if (wanted === 'join') return joinSpace(client, slug);
      await leaveSpace(client, slug);
      return null;
    },
    onSuccess: refresh,
  });
  return {
    join: () => mutation.mutateAsync('join'),
    leave: () => mutation.mutateAsync('leave'),
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Reads the requests waiting for the owner.
 *
 * @param slug - the space's address
 * @param isOwner - only the owner asks
 * @returns the query
 */
export function useJoinRequests(slug: string, isOwner: boolean) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'requests', slug],
    queryFn: async () => fetchJoinRequests(await requireClient(), slug),
    enabled: isOwner,
  });
}

/**
 * Lets someone in, or says no.
 *
 * @param slug - the space's address
 * @returns run({handle, approve}) → the outcome, the failure and isRunning
 */
export function useDecideJoinRequest(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (answer: { handle: string; approve: boolean }) =>
      decideJoinRequest(await requireClient(), { slug, ...answer }),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    outcome: mutation.data ?? null,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
