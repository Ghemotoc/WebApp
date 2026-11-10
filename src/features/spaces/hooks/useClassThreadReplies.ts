/**
 * useClassThreadReplies: "Who has replied" for a thread in a class space (bundle 14d IDEAS-3,
 * part b; idea IDEA-20261102-5).
 *
 * useSaveThreadDueDate: the teacher sets or clears an assignment's due date (MUST-1d).
 *
 * Who calls it: ClassRepliesPanel and ClassDueDateField. What it calls: fetchClassThreadReplies()
 * and saveThreadDueDate().
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchClassThreadReplies, saveThreadDueDate } from '../api/classThreadReplies';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import { spacesQueryKey } from './useSpaces';

/**
 * Reads the two lists for one thread, only when the thread is in a space and someone is signed
 * in (a visitor reading an open space is never a teacher, and may not call the function).
 *
 * @param threadId - the thread's ID
 * @param isInSpace - whether the thread lives in a space; other threads never ask
 * @returns the query: data is null for anyone who isn't the class's teacher
 */
export function useClassThreadReplies(threadId: string, isInSpace: boolean) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...spacesQueryKey, 'class-thread-replies', threadId],
    queryFn: async () => fetchClassThreadReplies(await requireClient(), threadId),
    enabled: isInSpace && userId !== null,
  });
}

/**
 * Saving an assignment's due date; afterwards every forum and space read is fetched again, so the
 * thread's "Due" line, the panel and the class space's list agree at once.
 *
 * @param threadId - the thread's ID
 * @returns TanStack Query's mutation: mutate(dueOn), with null to clear it
 */
export function useSaveThreadDueDate(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dueOn: string | null) =>
      saveThreadDueDate(await requireClient(), threadId, dueOn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
}
