/**
 * useLearningPath: the learning path's seven days with the signed-in writer's ticks, and ticking
 * a day (bundle GAPS-12g).
 *
 * Who calls it: HubPath and LearningPathPage. What it calls: api/hubPath.ts, and useSession so a
 * visitor who isn't signed in never asks the database.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchLearningPath, markLearningStep, type LearningStep } from '../api/hubPath';

/** The first part of the cache key, shared so a staff change refreshes every writer's path. */
export const learningPathKey = ['hub-learning-path'];

/** What the hook gives. */
export interface LearningPathState {
  /** The days in order; empty while loading or signed out. */
  steps: LearningStep[];
  isLoaded: boolean;
  loadFailed: boolean;
  /** Ticks a day or takes the tick off. */
  mark: (day: number, isDone: boolean) => void;
  isMarking: boolean;
  markFailed: boolean;
}

/**
 * Follows the path for the signed-in writer.
 *
 * @returns the days, whether they are in, and the way to tick one
 */
export function useLearningPath(): LearningPathState {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  // One cache entry per person, because the ticks are the caller's own.
  const path = useQuery<LearningStep[]>({
    queryKey: [...learningPathKey, userId],
    enabled: userId !== null,
    queryFn: async () => fetchLearningPath(await requireClient()),
  });
  const marking = useMutation({
    mutationFn: async (given: { day: number; isDone: boolean }) =>
      markLearningStep(await requireClient(), given.day, given.isDone),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: learningPathKey }),
  });
  return {
    steps: path.data ?? [],
    isLoaded: path.data !== undefined,
    loadFailed: path.isError,
    mark: (day, isDone) => marking.mutate({ day, isDone }),
    isMarking: marking.isPending,
    markFailed: marking.isError,
  };
}
