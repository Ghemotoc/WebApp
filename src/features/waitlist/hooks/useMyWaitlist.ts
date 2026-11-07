/**
 * useMyWaitlist and useSaveMyWaitlistInterest: the signed-in person's place on the waiting list,
 * and changing their "write, read or both" answer (bundle WAITLIST-1).
 *
 * Who calls them: WaitlistGate (whether to show the holding page) and WaitlistInterestPicker.
 * What they call: api/waitlist.ts. The place is read once a minute at most: staff letting the
 * person in shows on their next visit or after a minute, and the "You're in" email says so too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchMyWaitlist,
  saveMyWaitlistInterest,
  type MyWaitlist,
  type WaitlistInterest,
} from '../api/waitlist';

/** The cache key of one person's place. */
export function myWaitlistKey(userId: string | null) {
  return ['my-waitlist', userId] as const;
}

/**
 * The signed-in person's place on the list.
 *
 * @returns TanStack Query's result; disabled while signed out
 */
export function useMyWaitlist() {
  const { userId } = useSession();
  return useQuery<MyWaitlist>({
    queryKey: myWaitlistKey(userId),
    enabled: userId !== null,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => fetchMyWaitlist(await requireClient()),
  });
}

/**
 * Saves a new answer, then reads the place again.
 *
 * @returns TanStack Query's mutation
 */
export function useSaveMyWaitlistInterest() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wanted: WaitlistInterest) =>
      saveMyWaitlistInterest(await requireClient(), wanted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myWaitlistKey(userId) }),
  });
}
