/**
 * useStoryMarketing: a story's marketing notes, the writer's own details and their changers
 * (story S1-E17-29; bundle GAPS-2b).
 *
 * Who calls it: MarketingPage and MarketingDetails. What it calls: api/marketing.ts; after a
 * change it reads the notes again, so the page and the back-cover preview show the new text.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addMarketingDetail,
  deleteMarketingDetail,
  fetchStoryMarketing,
  saveMarketingDetail,
  saveMarketingField,
  storyMarketingQueryKey,
  type MarketingNotes,
  type StoryMarketing,
} from '../api/marketing';

/**
 * Follows a story's marketing notes.
 *
 * @param slug - the story's address
 * @returns notes (null when it isn't the writer's, undefined while loading), details (the
 *   writer's own, in order), loadFailed, save (one note) and the details' changers: addDetail,
 *   saveDetail and deleteDetail (each throws when it can't)
 */
export function useStoryMarketing(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyMarketingQueryKey(userId, slug);
  const marketing = useQuery<StoryMarketing | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryMarketing(await requireClient(), slug),
  });

  /** Runs one change, then reads the notes again. */
  async function changeThenRefresh(change: () => Promise<unknown>): Promise<void> {
    await change();
    await queryClient.invalidateQueries({ queryKey });
  }

  return {
    // null stays null (not the writer's story) and undefined stays undefined (still loading).
    notes: marketing.data === null ? null : marketing.data?.notes,
    details: marketing.data?.details ?? [],
    loadFailed: marketing.isError,
    save: async (field: keyof MarketingNotes, value: string) =>
      changeThenRefresh(async () => saveMarketingField(await requireClient(), slug, field, value)),
    addDetail: async (name: string) =>
      changeThenRefresh(async () => addMarketingDetail(await requireClient(), slug, name)),
    saveDetail: async (detailId: string, change: { name: string } | { text: string }) =>
      changeThenRefresh(async () =>
        saveMarketingDetail(await requireClient(), slug, detailId, change),
      ),
    deleteDetail: async (detailId: string) =>
      changeThenRefresh(async () => deleteMarketingDetail(await requireClient(), slug, detailId)),
  };
}
