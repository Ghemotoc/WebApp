/**
 * useTeacherChecks: the waiting Teacher badge requests, the teachers, and the staff actions on
 * them (story S1-E2-11).
 *
 * Who calls it: TeacherChecksPage. What it calls: api/teacherChecks.ts. After a decision or a
 * removal both lists are read again, so a decided request leaves the page and a new teacher shows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  decideTeacherCheck,
  listTeacherChecks,
  listTeachers,
  openTeacherProof,
  removeTeacherBadge,
  TeacherCheckError,
  type Teacher,
  type TeacherCheckFailure,
  type TeacherCheckRequest,
  type TeacherDecisionChange,
} from '../api/teacherChecks';

/** The cache keys of the two lists. */
const teacherChecksKey = ['teacher-checks'];
const teachersKey = ['teachers'];

/**
 * The reason a call failed, or null when it didn't.
 *
 * @returns the reason; unreachable for anything that isn't a TeacherCheckError
 */
function failureOf(hasFailed: boolean, error: unknown): TeacherCheckFailure | null {
  if (!hasFailed) return null;
  return error instanceof TeacherCheckError ? error.failure : 'unreachable';
}

/**
 * Follows the requests and the teachers.
 *
 * @returns the lists, the actions (openProof, decide, removeBadge) and their states
 */
export function useTeacherChecks() {
  const queryClient = useQueryClient();
  const requests = useQuery<TeacherCheckRequest[]>({
    queryKey: teacherChecksKey,
    retry: false,
    queryFn: async () => listTeacherChecks(await requireClient()),
  });
  const teachers = useQuery<Teacher[]>({
    queryKey: teachersKey,
    retry: false,
    queryFn: async () => listTeachers(await requireClient()),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: teacherChecksKey });
    await queryClient.invalidateQueries({ queryKey: teachersKey });
  };
  const decide = useMutation({
    mutationFn: async (change: TeacherDecisionChange) =>
      decideTeacherCheck(await requireClient(), change),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (change: { handle: string; reason: string }) =>
      removeTeacherBadge(await requireClient(), change),
    onSuccess: refresh,
  });
  return {
    requests: requests.data ?? [],
    teachers: teachers.data ?? [],
    isLoading: requests.isLoading || teachers.isLoading,
    loadFailure: failureOf(requests.isError, requests.error),
    openProof: async (checkId: string) => openTeacherProof(await requireClient(), checkId),
    decide: decide.mutateAsync,
    removeBadge: remove.mutateAsync,
    isBusy: decide.isPending || remove.isPending,
    actionFailure: failureOf(decide.isError || remove.isError, decide.error ?? remove.error),
  };
}
