/**
 * useReadingHabit: follows and changes the reader's private reading streak (bundle IDEAS-1, part
 * b; idea IDEA-20261031-13).
 *
 * Who calls it: the Library's ReadingHabitNote, and useReadingMinutes in the chapter reader (only
 * to know whether the streak is on). What it calls: api/readingHabit.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchReadingHabit,
  saveReadingHabit,
  startReadingHabit,
  stopReadingHabit,
  type ReadingHabitChoices,
} from '../api/readingHabit';

/** The query's first key; the reader's minute counter refreshes it after each minute. */
export const readingHabitQueryKey = 'reading-habit';

/**
 * Follows the streak and offers the three changes.
 *
 * @returns habit (null while off, undefined while loading), loadFailed, and start, save and stop
 *   mutations (each refreshes the streak when it is done)
 */
export function useReadingHabit() {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const queryKey = [readingHabitQueryKey, userId];
  // Step 1: the streak, read when a signed-in reader opens the page.
  const query = useQuery({
    queryKey,
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchReadingHabit(await requireClient()),
  });
  // Step 2: after any change, read it again, so the note shows what the database kept.
  const refresh = () => queryClient.invalidateQueries({ queryKey: [readingHabitQueryKey] });
  const start = useMutation({
    mutationFn: async () => startReadingHabit(await requireClient()),
    onSuccess: refresh,
  });
  const save = useMutation({
    mutationFn: async (choices: ReadingHabitChoices) =>
      saveReadingHabit(await requireClient(), choices),
    onSuccess: refresh,
  });
  const stop = useMutation({
    mutationFn: async () => stopReadingHabit(await requireClient()),
    onSuccess: refresh,
  });
  return { habit: query.data, loadFailed: query.isError, start, save, stop };
}
