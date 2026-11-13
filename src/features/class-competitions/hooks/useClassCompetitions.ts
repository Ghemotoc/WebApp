/**
 * Class competitions as React hooks (bundle CLASS-POINTS, part 2; story S1-E8-15).
 *
 * Who calls it: the components in ../components. What it calls: api/classCompetitions.ts. After
 * a change every competition read is fetched again, and the class points reads too, because
 * published results lock teacher points.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { classPointsKey } from '@/features/class-points/hooks/useClassPoints';

import {
  actOnCompetition,
  fetchClassCompetitions,
  saveClassCompetition,
  setClassGrade,
  type CompetitionAction,
  type CompetitionDetails,
} from '../api/classCompetitions';
import { competitionFailureOf } from '../api/competitionErrors';

/** The cache key every class competition read starts with. */
export const classCompetitionsKey = ['class-competitions'] as const;

/**
 * Fetches every competition read again, and the class points reads.
 *
 * @param queryClient - the app's query client
 * @returns when both are marked stale
 */
export async function refreshCompetitions(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: classCompetitionsKey }),
    queryClient.invalidateQueries({ queryKey: classPointsKey }),
  ]);
}

/**
 * Competitions on a class page, for the signed-in person.
 *
 * @param slug - the class's address
 * @returns the query: data is the competitions, or null for someone outside the class
 */
export function useClassCompetitions(slug: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: [...classCompetitionsKey, 'class', slug, userId],
    queryFn: async () => fetchClassCompetitions(await requireClient(), slug),
    enabled: userId !== null && slug !== '',
  });
}

/**
 * The teacher sets the class's school year.
 *
 * @param slug - the class's address
 * @returns save(grade), the failure and isRunning
 */
export function useSetClassGrade(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (grade: number) => setClassGrade(await requireClient(), { slug, grade }),
    onSuccess: () => refreshCompetitions(queryClient),
  });
  return {
    save: mutation.mutateAsync,
    failure: competitionFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * The teacher starts or changes a competition.
 *
 * @returns save(details), the failure and isRunning
 */
export function useSaveCompetition() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (details: CompetitionDetails) =>
      saveClassCompetition(await requireClient(), details),
    onSuccess: () => refreshCompetitions(queryClient),
  });
  return {
    save: mutation.mutateAsync,
    failure: competitionFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Ending or deleting a competition (the teacher), joining or leaving it (a pupil).
 *
 * @param competitionId - the competition's ID
 * @returns act(action), the failure and isRunning
 */
export function useCompetitionAction(competitionId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (action: CompetitionAction) =>
      actOnCompetition(await requireClient(), { action, competitionId }),
    onSuccess: () => refreshCompetitions(queryClient),
  });
  return {
    act: mutation.mutateAsync,
    failure: competitionFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
