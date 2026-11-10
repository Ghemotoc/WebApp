/**
 * useClassAssignments: a class space's open assignments, soonest first (bundle MUST-1, part d;
 * IDEA-20261108-8).
 *
 * Who calls it: ClassAssignmentsCard. What it calls: fetchClassAssignments(). A due date saved in
 * the teacher's panel refreshes it (useSaveThreadDueDate refreshes every forum and space read).
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchClassAssignments } from '../api/classAssignments';

import { spacesQueryKey } from './useSpaces';

/**
 * Reads the list for one class space.
 *
 * @param slug - the class space's address
 * @returns the query
 */
export function useClassAssignments(slug: string) {
  return useQuery({
    queryKey: [...spacesQueryKey, 'class-assignments', slug],
    queryFn: async () => fetchClassAssignments(await requireClient(), slug),
  });
}
