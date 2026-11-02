/**
 * Space moderators as React hooks (bundle FORUMS-2, part b; story S1-E8-07).
 *
 * Who calls it: SpaceRunsCard, SpaceModeratorsCard, SpaceMembersPage and SpaceLogPage. What it
 * calls: ../api/spaceModeration.ts. Every key sits under the spaces' key, and every change
 * refreshes all forum and space reads, because a moderator's powers change what the space and its
 * threads offer them.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import {
  fetchSpaceLog,
  fetchSpaceMembers,
  fetchSpaceModerators,
  removeSpaceMember,
  setSpaceModerator,
  type SpaceLogPage,
} from '../api/spaceModeration';
import type { SpacePower } from '../api/spaces';

import { spaceFailureOf, spacesQueryKey } from './useSpaces';

/** How many log lines a page holds (space_log() sends 50). */
const logPageSize = 50;

/**
 * Reads who helps run a space.
 *
 * @param slug - the space's address
 * @returns the query
 */
export function useSpaceModerators(slug: string) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'moderators', slug],
    queryFn: async () => fetchSpaceModerators(await requireClient(), slug),
  });
}

/**
 * Reads the space's members (the members power).
 *
 * @param slug - the space's address
 * @param mayRead - whether the caller holds the members power; nobody else asks
 * @returns the query
 */
export function useSpaceMembers(slug: string, mayRead: boolean) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'members', slug],
    queryFn: async () => fetchSpaceMembers(await requireClient(), slug),
    enabled: mayRead,
  });
}

/**
 * Reads the space's log, a page at a time.
 *
 * @param slug - the space's address
 * @param mayRead - whether the caller may read it (the owner and our moderation team)
 * @returns the lines so far (null while loading), hasMore, showMore(), isLoadingMore and loadFailed
 */
export function useSpaceLog(slug: string, mayRead: boolean) {
  const log = useInfiniteQuery({
    queryKey: [...spacesQueryKey, 'log', slug],
    queryFn: async ({ pageParam }: { pageParam: number }) =>
      fetchSpaceLog(await requireClient(), slug, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage: SpaceLogPage, pages: SpaceLogPage[]) =>
      lastPage.hasMore ? pages.length * logPageSize : null,
    enabled: mayRead,
  });
  const pages = log.data?.pages ?? null;
  return {
    entries: pages === null ? null : pages.flatMap((page) => page.entries),
    hasMore: log.hasNextPage,
    showMore: () => void log.fetchNextPage(),
    isLoadingMore: log.isFetchingNextPage,
    loadFailed: log.isError,
  };
}

/**
 * Refreshes every forum and space read after a change.
 *
 * @returns the function to call on success
 */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
}

/**
 * Appoints a moderator, changes their powers or takes them away (the owner).
 *
 * @param slug - the space's address
 * @returns run({handle, powers}) → the outcome, the last outcome, the failure and isRunning
 */
export function useSetSpaceModerator(slug: string) {
  const refresh = useRefreshAll();
  const mutation = useMutation({
    mutationFn: async (change: { handle: string; powers: SpacePower[] }) =>
      setSpaceModerator(await requireClient(), { slug, ...change }),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    outcome: mutation.data ?? null,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Takes a member out of the space (the members power).
 *
 * @param slug - the space's address
 * @returns run({handle, reason}), whether it worked, the failure and isRunning
 */
export function useRemoveSpaceMember(slug: string) {
  const refresh = useRefreshAll();
  const mutation = useMutation({
    mutationFn: async (removal: { handle: string; reason: string }) =>
      removeSpaceMember(await requireClient(), { slug, ...removal }),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    isDone: mutation.isSuccess,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
