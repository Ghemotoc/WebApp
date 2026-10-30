/**
 * useTagRanks: a story's ranks in its tags, and the writer's pick of badges (CMS-1g).
 *
 * Who calls it: RankBadges (the story page, under the cover) and RankBadgePicker (Story settings).
 * What it calls: api/tagRanks.ts. Ranks follow the hourly ranking job, so they are kept for five
 * minutes; saving a pick reads them again at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchTagRanks, saveRankBadgePick, type RankPickOutcome } from '../api/tagRanks';

/**
 * The ranks of one story.
 *
 * @param slug - the story's public address
 * @returns the query: data is the list of ranks
 */
export function useTagRanks(slug: string) {
  return useQuery({
    queryKey: ['tag-ranks', slug],
    queryFn: async () => fetchTagRanks(await requireClient(), slug),
    staleTime: 5 * 60_000,
  });
}

/**
 * Saving the writer's pick of badges.
 *
 * @param slug - the writer's story
 * @returns the mutation: call mutate(tagNames); data is the outcome
 */
export function useSaveRankBadgePick(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagNames: string[]): Promise<RankPickOutcome> =>
      saveRankBadgePick(await requireClient(), slug, tagNames),
    // Step 1: read the ranks again, so the picker and the story page show the new badges.
    onSettled: async () => queryClient.invalidateQueries({ queryKey: ['tag-ranks', slug] }),
  });
}
