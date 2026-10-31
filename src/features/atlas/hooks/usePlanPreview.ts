/**
 * usePlanPreview: "Preview as a reader" for the writer (story S1-E17-32).
 *
 * Who calls it: PlanPreviewPage. What it calls: api/readerView.ts → preview_story_plan().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import type { PublicPlan } from '../api/publicPlan';
import { fetchPlanPreview, planPreviewQueryKey } from '../api/readerView';

/**
 * Follows the preview of one of the writer's stories.
 *
 * @param slug - the story's address
 * @returns preview (null when it isn't the writer's story, undefined while loading) and
 *   loadFailed
 */
export function usePlanPreview(slug: string) {
  const { userId } = useSession();
  const preview = useQuery<{ plan: PublicPlan; isPublished: boolean } | null>({
    queryKey: planPreviewQueryKey(userId, slug),
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchPlanPreview(await requireClient(), slug),
  });
  return { preview: preview.data, loadFailed: preview.isError };
}
