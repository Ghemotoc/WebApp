/**
 * useStaffLearningPath: saving one day of the learning path from the staff page (bundle
 * GAPS-12g). The list itself comes from useLearningPath: staff read the same seven days.
 *
 * Who calls it: LearningPathSection. What it calls: api/hubPath.ts. After a save every writer's
 * path is read again.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { saveLearningStep, type LearningStepTexts } from '../api/hubPath';
import { hubStaffFailureOf } from '../api/hubStaffErrors';

import { learningPathKey } from './useLearningPath';

/**
 * How to save a day and what went wrong last time.
 *
 * @returns save, whether it is running and why the last one failed
 */
export function useStaffLearningPath() {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async (given: { day: number; texts: LearningStepTexts }) =>
      saveLearningStep(await requireClient(), given.day, given.texts),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: learningPathKey }),
  });
  return { save, isChanging: save.isPending, changeFailure: hubStaffFailureOf(save.error) };
}
