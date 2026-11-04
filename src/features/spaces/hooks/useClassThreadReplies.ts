/**
 * useClassThreadReplies: "Who has replied" for a thread in a class space (bundle 14d IDEAS-3,
 * part b; idea IDEA-20261102-5).
 *
 * Who calls it: ClassRepliesPanel. What it calls: fetchClassThreadReplies().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchClassThreadReplies } from '../api/classThreadReplies';
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
