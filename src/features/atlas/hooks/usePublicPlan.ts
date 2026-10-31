/**
 * usePublicPlan: what readers see of a story's plan (story S1-E17-33).
 *
 * Who calls it: StoryWorldLinks (the story page) and PublicPlanPage.
 * What it calls: api/publicPlan.ts → get_public_story_plan(). Signed-out visitors read it too;
 * the database decides what each caller may see.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchPublicPlan, publicPlanQueryKey, type PublicPlan } from '../api/publicPlan';

/**
 * Follows a story's public plan.
 *
 * @param slug - the story's address
 * @returns plan (null when the caller may not read the story, undefined while loading) and
 *   loadFailed
 */
export function usePublicPlan(slug: string) {
  const { userId, isKnown } = useSession();
  const plan = useQuery<PublicPlan | null>({
    queryKey: publicPlanQueryKey(userId, slug),
    // Wait until the session is known, so a signed-in reader's guards are read as theirs.
    enabled: isKnown && slug !== '',
    queryFn: async () => fetchPublicPlan(await requireClient(), slug),
  });
  return { plan: plan.data, loadFailed: plan.isError };
}
