/**
 * usePlanVisibility: a story's "What readers can see" switches and their saves (stories
 * S1-E17-32 and S1-E17-35).
 *
 * Who calls it: ReaderViewPage, ItemVisibilityControls and SheetPartsControls.
 * What it calls: api/readerView.ts; after each save it reads the switches, the preview and the
 * public plan again, so every screen shows the new state at once.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import type { PlanArea } from '../api/publicPlan';
import {
  fetchPlanVisibility,
  planVisibilityQueryKey,
  saveItemPrivacy,
  saveItemShowFrom,
  savePublicAreas,
  saveSheetParts,
  type PlanVisibility,
} from '../api/readerView';

/**
 * Follows one story's switches.
 *
 * @param slug - the story's address
 * @returns visibility (null when it isn't the writer's story, undefined while loading),
 *   loadFailed and the four saves (each throws when it can't)
 */
export function usePlanVisibility(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = planVisibilityQueryKey(userId, slug);
  const visibility = useQuery<PlanVisibility | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchPlanVisibility(await requireClient(), slug),
  });

  /** Reads everything a switch changes again: the switches, the preview and readers' view. */
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ['plan-preview'] }),
      queryClient.invalidateQueries({ queryKey: ['public-story-plan'] }),
    ]);
  }

  return {
    visibility: visibility.data,
    loadFailed: visibility.isError,
    saveAreas: async (areas: PlanArea[]) => {
      await savePublicAreas(await requireClient(), slug, areas);
      await refresh();
    },
    savePrivacy: async (itemId: string, keepPrivate: boolean) => {
      await saveItemPrivacy(await requireClient(), itemId, keepPrivate);
      await refresh();
    },
    saveShowFrom: async (itemId: string, chapterCode: string) => {
      await saveItemShowFrom(await requireClient(), itemId, chapterCode);
      await refresh();
    },
    saveParts: async (characterId: string, parts: string[]) => {
      await saveSheetParts(await requireClient(), characterId, parts);
      await refresh();
    },
  };
}
