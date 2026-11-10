/**
 * useMyStoryPlans: the writer's list of story plans on /plan (bundle G10 ATLAS, part a).
 *
 * Who calls it: AtlasHomePage. What it calls: api/storyPlanList.ts → my_story_plans().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchMyStoryPlans,
  myStoryPlansQueryKey,
  type StoryPlanSummary,
} from '../api/storyPlanList';

/**
 * Follows the writer's story plans.
 *
 * @returns plans (undefined while loading or signed out) and loadFailed
 */
export function useMyStoryPlans(): { plans: StoryPlanSummary[] | undefined; loadFailed: boolean } {
  const { userId } = useSession();
  const query = useQuery<StoryPlanSummary[]>({
    queryKey: myStoryPlansQueryKey(userId),
    // Only a signed-in writer has plans; the page says so to everyone else.
    enabled: userId !== null,
    queryFn: async () => fetchMyStoryPlans(await requireClient()),
  });
  return { plans: query.data, loadFailed: query.isError };
}
