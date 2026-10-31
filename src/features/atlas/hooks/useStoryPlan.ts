/**
 * useStoryPlan: one of the writer's story plans, and the savers for its fields (stories
 * S1-E17-03 to S1-E17-06).
 *
 * Who calls it: StoryAtlasPage and the at-a-glance sections. What it calls: api/storyPlans.ts →
 * story_plan(), update_story_plan() and update_my_story(). After the story's own fields change it
 * refreshes the writer's story list too, so the switcher and Your writing show the new title
 * (S1-E17-03: "the switcher and the story's public pages show the new title").
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { myStoriesKey } from '@/features/writing/hooks/useMyStories';

import {
  fetchStoryPlan,
  savePlanField,
  saveStoryField,
  storyPlanQueryKey,
  type PlanFields,
  type StoryField,
  type StoryPlanPage,
} from '../api/storyPlans';

/**
 * Follows one story's plan.
 *
 * @param slug - the story's address
 * @returns page (null when it isn't the writer's live story, undefined while loading), loadFailed,
 *   savePlan (one plan field) and saveStory (the title, genre or audience)
 */
export function useStoryPlan(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyPlanQueryKey(userId, slug);
  const plan = useQuery<StoryPlanPage | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryPlan(await requireClient(), slug),
  });

  /** Saves one of the plan's own fields, then refreshes the plan so the summary shows it. */
  async function savePlan<Field extends keyof PlanFields>(field: Field, value: PlanFields[Field]) {
    await savePlanField(await requireClient(), slug, field, value);
    await queryClient.invalidateQueries({ queryKey });
  }

  /** Saves the story's title, genre or audience, then refreshes the plan and the story list. */
  async function saveStory(field: StoryField, value: string) {
    await saveStoryField(await requireClient(), slug, field, value);
    await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
    await queryClient.invalidateQueries({ queryKey });
  }

  return { page: plan.data, loadFailed: plan.isError, savePlan, saveStory };
}
