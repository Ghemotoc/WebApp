/**
 * useFeaturedPicks: the ranking for Stories › Featured, the list being picked and saving it (story
 * S1-E5-10, bundle LOOK-4a).
 *
 * Who calls it: components/featured/FeaturedPage.tsx. What it calls: api/featured.ts. The picks
 * start as the band holds them; ticking, moving and removing change only this page's list until
 * Save, after which the ranking is read again so the page shows what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  FeaturedError,
  fetchFeaturedCandidates,
  saveFeaturedPicks,
  type FeaturedCandidates,
  type FeaturedFailure,
  type FeaturedView,
} from '../api/featured';

/** The cache key's first part. */
const featuredKey = 'staff-featured';

/**
 * The reason a call failed, or null when it didn't.
 *
 * @returns the reason; unreachable for anything that isn't a FeaturedError
 */
function failureOf(hasFailed: boolean, error: unknown): FeaturedFailure | null {
  if (!hasFailed) return null;
  return error instanceof FeaturedError ? error.failure : 'unreachable';
}

/**
 * Moves one item a place up or down in a list.
 *
 * @returns a new list
 */
function moved(list: string[], storyId: string, step: -1 | 1): string[] {
  const from = list.indexOf(storyId);
  const to = from + step;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const copy = [...list];
  [copy[from], copy[to]] = [copy[to] as string, copy[from] as string];
  return copy;
}

/**
 * Follows the ranking and the picks for one view.
 *
 * @param view - the view staff chose
 * @returns the data, the picks being edited and the actions on them
 */
export function useFeaturedPicks(view: FeaturedView) {
  const queryClient = useQueryClient();
  const candidates = useQuery<FeaturedCandidates>({
    queryKey: [featuredKey, view],
    retry: false,
    queryFn: async () => fetchFeaturedCandidates(await requireClient(), view),
  });
  const [picks, setPicks] = useState<string[] | null>(null);
  // Step 1: until staff change something, the picks are the ones the band holds now.
  const savedPicks = candidates.data?.picks;

  // Step 2: saving sends the list in order, then reads every view again.
  const save = useMutation({
    mutationFn: async (reason: string) =>
      saveFeaturedPicks(await requireClient(), picks ?? [], reason),
    onSuccess: async () => {
      setPicks(null);
      await queryClient.invalidateQueries({ queryKey: [featuredKey] });
    },
  });
  const current = picks ?? savedPicks ?? [];
  return {
    data: candidates.data ?? null,
    loadFailure: failureOf(candidates.isError, candidates.error),
    picks: current,
    toggle: (storyId: string) =>
      setPicks(
        current.includes(storyId) ? current.filter((id) => id !== storyId) : [...current, storyId],
      ),
    move: (storyId: string, step: -1 | 1) => setPicks(moved(current, storyId, step)),
    save: save.mutate,
    isSaving: save.isPending,
    saveFailure: failureOf(save.isError, save.error),
    hasSaved: save.isSuccess,
  };
}
