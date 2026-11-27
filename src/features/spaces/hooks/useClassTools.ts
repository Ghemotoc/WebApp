/**
 * The teacher's class tools as React hooks: a class's lock and the members
 * still waiting to read (bundle CLASSES, part b; story S1-E8-11).
 *
 * Who calls it: ClassLockCard, ClassArchiveCard and
 * ClassWaitingCard (space settings). What it calls: api/classTools.ts. After a change every forum and space read
 * refreshes, so the space page shows the lock at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import {
  archiveClassSpace,
  ClassToolError,
  fetchClassWaitingMembers,
  setClassLock,
} from '../api/classTools';

import { spacesQueryKey } from './useSpaces';

/**
 * The failure a call ended with, as a ClassToolError.
 *
 * @param error - whatever the call threw
 * @returns the error, or null when there is none
 */
export function classToolFailureOf(error: Error | null): ClassToolError | null {
  if (error === null) return null;
  return error instanceof ClassToolError ? error : new ClassToolError('unreachable');
}

/**
 * Changes when the class locks, locks it now or unlocks it.
 *
 * @param slug - the space's address
 * @returns change(locksAt) where null unlocks; the failure and isRunning
 */
export function useClassLock(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (locksAt: string | null) =>
      setClassLock(await requireClient(), { slug, locksAt }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    change: mutation.mutateAsync,
    failure: classToolFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * The members of the class still waiting to read, for whoever manages its members.
 *
 * @param slug - the space's address
 * @returns the query: data is the list
 */
export function useClassWaitingMembers(slug: string) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'class-waiting', slug],
    queryFn: async () => fetchClassWaitingMembers(await requireClient(), slug),
  });
}

/**
 * Archives the class for good (CLASSES-d).
 *
 * @param slug - the class's address
 * @returns archive(), the failure and isRunning
 */
export function useArchiveClass(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => archiveClassSpace(await requireClient(), slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    archive: mutation.mutateAsync,
    failure: classToolFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
