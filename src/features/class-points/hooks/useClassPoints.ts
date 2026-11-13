/**
 * Class points as React hooks (bundle CLASS-POINTS, part 1; stories S1-E8-13, 14 and 16).
 *
 * Who calls it: the components in ../components. What it calls: api/classPoints.ts. After a
 * change, every class points read is fetched again, so the budget on the class page, the chapter
 * and the teacher's table always agree.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  ClassPointsError,
  fetchChapterClassPoints,
  fetchClassPointsSummary,
  fetchThreadTeacherPoints,
  giveClassPoints,
  type GiveRequest,
  setClassPoints,
  setTeacherPoints,
  type TeacherPointsRequest,
} from '../api/classPoints';
import { fetchClassPointsTable, reportClassPoints } from '../api/classPointsTable';

/** The cache key every class points read starts with. */
export const classPointsKey = ['class-points'] as const;

/**
 * The failure a call ended with, as a ClassPointsError.
 *
 * @param error - whatever the call threw
 * @returns the error, or null when there is none
 */
export function classPointsFailureOf(error: Error | null): ClassPointsError | null {
  if (error === null) return null;
  return error instanceof ClassPointsError ? error : new ClassPointsError('unreachable');
}

/**
 * Class points on a class page, for the signed-in person.
 *
 * @param slug - the class's address
 * @returns the query: data is the summary, or null for someone outside the class
 */
export function useClassPointsSummary(slug: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...classPointsKey, 'summary', slug, userId],
    queryFn: async () => fetchClassPointsSummary(await requireClient(), slug),
    enabled: userId !== null,
  });
}

/**
 * The teacher's switch.
 *
 * @param slug - the class's address
 * @returns change(isOn), the failure and isRunning
 */
export function useSetClassPoints(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (isOn: boolean) => setClassPoints(await requireClient(), { slug, isOn }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classPointsKey }),
  });
  return {
    change: mutation.mutateAsync,
    failure: classPointsFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Class points on one chapter. The read also tells the database that a classmate opened the
 * chapter, so it runs once per visit and is not repeated when the window gets focus again.
 *
 * @param chapterId - the chapter's row ID
 * @returns the query: data is the chapter's class points, or null when there are none
 */
export function useChapterClassPoints(chapterId: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...classPointsKey, 'chapter', chapterId, userId],
    queryFn: async () => fetchChapterClassPoints(await requireClient(), chapterId),
    enabled: userId !== null,
    refetchOnWindowFocus: false,
  });
}

/**
 * A pupil gives, changes or takes back this week's points for a chapter.
 *
 * @param chapterId - the chapter's row ID
 * @returns give({points, note}), the failure and isRunning
 */
export function useGiveClassPoints(chapterId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: Omit<GiveRequest, 'chapterId'>) =>
      giveClassPoints(await requireClient(), { chapterId, ...request }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classPointsKey }),
  });
  return {
    give: mutation.mutateAsync,
    failure: classPointsFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * The teacher saves or removes their points on a chapter or a reply.
 *
 * @returns save(request), the failure and isRunning
 */
export function useSetTeacherPoints() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: TeacherPointsRequest) =>
      setTeacherPoints(await requireClient(), request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classPointsKey }),
  });
  return {
    save: mutation.mutateAsync,
    failure: classPointsFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * The teacher points on a class thread's replies.
 *
 * @param threadId - the thread's row ID
 * @param isInSpace - false for a thread outside any space, which is never asked about
 * @returns the query: data is the points, or null outside a class with points on
 */
export function useThreadTeacherPoints(threadId: string, isInSpace: boolean) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...classPointsKey, 'thread', threadId, userId],
    queryFn: async () => fetchThreadTeacherPoints(await requireClient(), threadId),
    enabled: isInSpace && userId !== null,
  });
}

/**
 * The teacher's table.
 *
 * @param slug - the class's address
 * @returns the query: data is the pupils, or null for anyone but the teacher or while points are off
 */
export function useClassPointsTable(slug: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...classPointsKey, 'table', slug, userId],
    queryFn: async () => fetchClassPointsTable(await requireClient(), slug),
    enabled: userId !== null,
  });
}

/**
 * The teacher reports a chapter's points as suspicious.
 *
 * @returns report({chapterId, why}), the failure and isRunning
 */
export function useReportClassPoints() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (request: { chapterId: string; why: string }) =>
      reportClassPoints(await requireClient(), request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classPointsKey }),
  });
  return {
    report: mutation.mutateAsync,
    failure: classPointsFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
