/**
 * useWinnerNotice: the "You're the winner" notice for one class, and Done (bundle BOOKS-8, part
 * 8c; board G13, user story 8.13).
 *
 * Who calls it: WinnerNotice. What it calls: fetchWinnerNotice() and dismissWinnerNotice() in
 * api/winnerNotice.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { dismissWinnerNotice, fetchWinnerNotice } from '../api/winnerNotice';
import { classCompetitionsKey } from './useClassCompetitions';

/**
 * Reads the notice the signed-in member still has to see, and closes it.
 *
 * @param slug - the class's address
 * @returns the notice query and close(), which hides it at once and remembers it in the database
 */
export function useWinnerNotice(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = [...classCompetitionsKey, 'winner-notice', slug, userId];
  const notice = useQuery({
    queryKey,
    queryFn: async () => fetchWinnerNotice(await requireClient(), slug),
    // Only a signed-in member can win; a visitor never asks (the database refuses anon).
    enabled: userId !== null && slug !== '',
  });
  const closing = useMutation({
    mutationFn: async (competitionId: string) =>
      dismissWinnerNotice(await requireClient(), competitionId),
    // Step 1: hide the notice straight away, so Done feels instant.
    onMutate: () => queryClient.setQueryData(queryKey, null),
    // Step 2: read it again afterwards, in case another competition's notice is still due.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  return { notice, close: (competitionId: string) => closing.mutate(competitionId) };
}
