/**
 * useStaffClassSpaces: every class space and the staff actions on them, for Staff › Schools ›
 * Class spaces (bundle CLASSES, part d; story S1-E8-11 criterion 10).
 *
 * Who calls it: ClassSpacesPage, NewClassSpaceForm and StaffClassCard. What it calls:
 * api/staffClassSpaces.ts. After a change the list is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  createStaffClassSpace,
  listStaffClassSpaces,
  setStaffClassSchool,
  StaffClassError,
  type NewStaffClassSpace,
} from '../api/staffClassSpaces';

/** The cache key of the list. */
export const staffClassSpacesKey = ['staff-class-spaces'];

/**
 * The failure a call ended with.
 *
 * @param error - whatever the call threw, or null
 * @returns the failure, or null when there is none
 */
export function staffClassFailureOf(error: Error | null): StaffClassError | null {
  if (error === null) return null;
  return error instanceof StaffClassError ? error : new StaffClassError('unreachable');
}

/**
 * Every class space.
 *
 * @returns the query: data is the list
 */
export function useStaffClassSpaces() {
  return useQuery({
    queryKey: staffClassSpacesKey,
    retry: false,
    queryFn: async () => listStaffClassSpaces(await requireClient()),
  });
}

/**
 * Sets up a class for a pilot school.
 *
 * @returns create(request) → the new address; the failure and isRunning
 */
export function useCreateStaffClassSpace() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: NewStaffClassSpace) =>
      createStaffClassSpace(await requireClient(), request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffClassSpacesKey }),
  });
  return {
    create: mutation.mutateAsync,
    created: mutation.data ?? null,
    failure: staffClassFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Writes the school a class belongs to.
 *
 * @param slug - the class's address
 * @returns save(schoolName); the failure, isRunning and isDone
 */
export function useSetStaffClassSchool(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (schoolName: string) =>
      setStaffClassSchool(await requireClient(), { slug, schoolName }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffClassSpacesKey }),
  });
  return {
    save: mutation.mutateAsync,
    failure: staffClassFailureOf(mutation.error),
    isRunning: mutation.isPending,
    isDone: mutation.isSuccess,
  };
}
