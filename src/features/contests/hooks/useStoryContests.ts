/**
 * useStoryContests: the contests a writer can enter from one story's settings, and entering or
 * withdrawing (story S1-E11-15 criteria 3 and 4; bundle CONTESTS-13b1).
 *
 * Who calls it: StoryContestCard. What it calls: api/contests.ts (contest_entry_options(),
 * enter_contest(), withdraw_contest_entry()). After each change the list is read again, so the
 * card shows the entry as the database now holds it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  ContestError,
  enterContest,
  fetchContestEntryOptions,
  withdrawContestEntry,
} from '../api/contests';

/** The cache key every contest read starts with. */
export const contestsQueryKey = ['contests'] as const;

/** One change on the card. */
export type StoryContestChange =
  { kind: 'enter'; contestId: string } | { kind: 'withdraw'; contestId: string };

/**
 * Turns anything thrown into a ContestError, so the card always has a reason to show.
 *
 * @param error - what the last change threw, or null
 * @returns the ContestError, or null when nothing failed
 */
export function contestFailureOf(error: Error | null): ContestError | null {
  if (error === null) return null;
  return error instanceof ContestError ? error : new ContestError('failed', error.message, []);
}

/**
 * Reads the contests for one story and offers the two changes.
 *
 * @param storySlug - the writer's story
 * @returns the query, change(), the last change, its failure and whether one is running
 */
export function useStoryContests(storySlug: string) {
  const queryClient = useQueryClient();
  const queryKey = [...contestsQueryKey, 'story', storySlug];
  const options = useQuery({
    queryKey,
    queryFn: async () => fetchContestEntryOptions(await requireClient(), storySlug),
  });
  const mutation = useMutation({
    mutationFn: async (change: StoryContestChange) => {
      const client = await requireClient();
      if (change.kind === 'enter') {
        await enterContest(client, change.contestId, storySlug);
        return change;
      }
      await withdrawContestEntry(client, change.contestId);
      return change;
    },
    // The entry changed, so the card reads the list again.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  return {
    options,
    change: (change: StoryContestChange) => mutation.mutate(change),
    lastChange: mutation.variables ?? null,
    isDone: mutation.isSuccess,
    failure: contestFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
