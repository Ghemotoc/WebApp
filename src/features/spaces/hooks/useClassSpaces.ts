/**
 * Class spaces' invite codes and joining a class as React hooks (bundle CLASSES, part a; story
 * S1-E8-11).
 *
 * Who calls it: ClassInviteCard (space settings) and JoinClassPage (/class/:code). What it calls:
 * api/classSpaces.ts. After a change every forum and space read refreshes, so the space page and
 * its log show the new state at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import {
  ClassInviteError,
  endClassInvite,
  fetchClassInvite,
  fetchClassInvitePreview,
  joinClassSpace,
  makeClassInvite,
} from '../api/classSpaces';

import { spacesQueryKey } from './useSpaces';

/**
 * The failure a call ended with, as a ClassInviteError.
 *
 * @param error - whatever the call threw
 * @returns the error, or null when there is none
 */
export function classInviteFailureOf(error: Error | null): ClassInviteError | null {
  if (error === null) return null;
  return error instanceof ClassInviteError ? error : new ClassInviteError('unreachable');
}

/**
 * The class's working code for its card.
 *
 * @param slug - the space's address
 * @returns the query: data is the status, or null when no code works
 */
export function useClassInvite(slug: string) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'class-invite', slug],
    queryFn: async () => fetchClassInvite(await requireClient(), slug),
  });
}

/**
 * Making a new code and stopping the code.
 *
 * @param slug - the space's address
 * @returns make({ validDays, admits }) → the code shown once; end(); the failure and isRunning
 */
export function useClassInviteChanges(slug: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
  const making = useMutation({
    mutationFn: async (request: { validDays: number; admits: number }) =>
      makeClassInvite(await requireClient(), { slug, ...request }),
    onSuccess: refresh,
  });
  const ending = useMutation({
    mutationFn: async () => endClassInvite(await requireClient(), slug),
    onSuccess: refresh,
  });
  return {
    make: making.mutateAsync,
    made: making.data ?? null,
    forget: making.reset,
    end: ending.mutateAsync,
    failure: classInviteFailureOf(making.error ?? ending.error),
    isRunning: making.isPending || ending.isPending,
  };
}

/**
 * Which class a code is for.
 *
 * @param code - the code from the link
 * @returns the query: data is valid (with the class's name), ended or unknown
 */
export function useClassInvitePreview(code: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...spacesQueryKey, 'class-invite-preview', code, userId],
    queryFn: async () => fetchClassInvitePreview(await requireClient(), code),
  });
}

/**
 * Joining a class with its code.
 *
 * @returns join(code) → the class's address and whether the student can read yet; the failure
 *   and isRunning
 */
export function useJoinClass() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (code: string) => joinClassSpace(await requireClient(), code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    join: mutation.mutateAsync,
    joined: mutation.data ?? null,
    failure: classInviteFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
