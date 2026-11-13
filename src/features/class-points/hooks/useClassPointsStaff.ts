/**
 * Class points for our moderation team, as React hooks (bundle CLASS-POINTS, part 1; story
 * S1-E8-16).
 *
 * Who calls it: components/staff/StaffClassPointsPage and its parts. What it calls:
 * api/classPointsStaff.ts. The gifts of a flag are read only when a moderator asks to see them,
 * because that read shows who gave points and goes in the audit log.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  type ClassPointFlag,
  ClassPointsStaffError,
  closeClassPointFlag,
  fetchClassGifts,
  fetchClassPointFlags,
  removeClassGift,
} from '../api/classPointsStaff';

import { classPointsKey } from './useClassPoints';

/** The cache key every staff read starts with. */
const staffKey = [...classPointsKey, 'staff'] as const;

/**
 * The failure a call ended with, as a ClassPointsStaffError.
 *
 * @param error - whatever the call threw
 * @returns the error, or null when there is none
 */
export function classPointsStaffFailureOf(error: Error | null): ClassPointsStaffError | null {
  if (error === null) return null;
  return error instanceof ClassPointsStaffError ? error : new ClassPointsStaffError('unreachable');
}

/**
 * The open flags.
 *
 * @returns the query: data is the flags, oldest first
 */
export function useClassPointFlags() {
  return useQuery({
    queryKey: [...staffKey, 'flags'],
    queryFn: async () => fetchClassPointFlags(await requireClient()),
    // A refusal by role won't change by asking again.
    retry: false,
  });
}

/**
 * The gifts behind one flag, read only once a moderator opens them.
 *
 * @param flag - the flag
 * @param isOpen - true once the moderator pressed "Show gifts"
 * @returns the query: data is the gifts with their givers
 */
export function useClassGifts(flag: ClassPointFlag, isOpen: boolean) {
  return useQuery({
    queryKey: [...staffKey, 'gifts', flag.id],
    queryFn: async () => fetchClassGifts(await requireClient(), flag),
    enabled: isOpen,
    // Each read is written to the audit log, so it isn't repeated behind the moderator's back.
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Removes a gift and closes a flag.
 *
 * @returns remove({giftId, reason}), close(flagId), the failure of the last one and isRunning
 */
export function useClassPointsModeration() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: classPointsKey });
  const removing = useMutation({
    mutationFn: async (request: { giftId: string; reason: string }) =>
      removeClassGift(await requireClient(), request),
    onSuccess: refresh,
  });
  const closing = useMutation({
    mutationFn: async (flagId: string) => closeClassPointFlag(await requireClient(), flagId),
    onSuccess: refresh,
  });
  return {
    remove: removing.mutateAsync,
    close: closing.mutateAsync,
    failure: classPointsStaffFailureOf(removing.error ?? closing.error),
    isRunning: removing.isPending || closing.isPending,
  };
}
