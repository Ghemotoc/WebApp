/**
 * Blocking people from a space, and answering an invitation to help run one, as React hooks
 * (bundle BOOKS-7, board F11, user stories 7.7, 7.10 and 7.11).
 *
 * Who calls it: SpaceMembersPage, SpaceBlockedList and SpaceModeratorInviteNote. What it calls:
 * ../api/spaceBlocks.ts and ../api/spaceModeration.ts. Every change refreshes all forum and
 * space reads, as the other moderation hooks do, because blocking takes someone out and an
 * accepted invitation changes what the space offers the reader.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import { blockSpaceMember, fetchBlockedMembers, unblockSpaceMember } from '../api/spaceBlocks';
import { answerModeratorInvite } from '../api/spaceModeration';

import { spaceFailureOf, spacesQueryKey } from './useSpaces';

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
 * Reads the people the space blocked (the members power).
 *
 * @param slug - the space's address
 * @param mayRead - whether the caller holds the members power; nobody else asks
 * @returns the query
 */
export function useBlockedMembers(slug: string, mayRead: boolean) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'blocked', slug],
    queryFn: async () => fetchBlockedMembers(await requireClient(), slug),
    enabled: mayRead,
  });
}

/**
 * Blocks someone: takes them out and stops them asking to join again (user story 7.11).
 *
 * @param slug - the space's address
 * @returns run({handle, reason}), whether it worked, the failure and isRunning
 */
export function useBlockSpaceMember(slug: string) {
  const refresh = useRefreshAll();
  const mutation = useMutation({
    mutationFn: async (block: { handle: string; reason: string }) =>
      blockSpaceMember(await requireClient(), { slug, ...block }),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    isDone: mutation.isSuccess,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Lifts a block, so the person may ask to join again.
 *
 * @param slug - the space's address
 * @returns run(handle), whether it worked, the failure and isRunning
 */
export function useUnblockSpaceMember(slug: string) {
  const refresh = useRefreshAll();
  const mutation = useMutation({
    mutationFn: async (handle: string) =>
      unblockSpaceMember(await requireClient(), { slug, handle }),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    isDone: mutation.isSuccess,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Accepts or declines the owner's invitation to help run the space (user stories 7.7, 7.10).
 *
 * @param slug - the space's address
 * @returns run(accept) → 'accepted' or 'declined', the answer given, the failure and isRunning
 */
export function useAnswerModeratorInvite(slug: string) {
  const refresh = useRefreshAll();
  const mutation = useMutation({
    mutationFn: async (accept: boolean) =>
      answerModeratorInvite(await requireClient(), { slug, accept }),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    answer: mutation.data ?? null,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
