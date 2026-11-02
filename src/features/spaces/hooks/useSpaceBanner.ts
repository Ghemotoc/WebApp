/**
 * A space's banner picture as React hooks (bundle FORUMS-2, part c; story S1-E8-06).
 *
 * Who calls it: SpaceBannerBand (the header draws the picture) and SpaceBannerPictureCard (the
 * settings page changes it). What it calls: ../api/spaceBanner.ts. A change refreshes every space
 * read, so the header and the settings show the new picture's state at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import {
  fetchSpaceBannerView,
  setSpaceBannerPicture,
  uploadAndSetSpaceBanner,
} from '../api/spaceBanner';
import type { Space } from '../api/spaces';

import { spacesQueryKey } from './useSpaces';

/** Signed addresses last an hour; the view is asked for again well before that. */
const freshForMilliseconds = 30 * 60 * 1000;

/**
 * Follows the banner picture's signed address.
 *
 * @param space - the space
 * @returns the query: data is the view, or null when the space uses its drawn colour
 */
export function useSpaceBannerView(space: Space) {
  const picture = space.bannerPicture;
  return useQuery({
    queryKey: [
      ...spacesQueryKey,
      'banner',
      space.slug,
      picture?.state ?? null,
      picture?.path ?? null,
    ],
    enabled: picture !== null,
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => fetchSpaceBannerView(await requireClient(), space),
  });
}

/**
 * Uploads a new banner picture, or takes it off (the settings power).
 *
 * @param space - the space
 * @returns upload (file → the check's status), remove, and their mutations' states
 */
export function useSpaceBannerChange(space: Space) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
  const upload = useMutation({
    mutationFn: async (file: File) => uploadAndSetSpaceBanner(await requireClient(), space, file),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => setSpaceBannerPicture(await requireClient(), space.slug, null),
    onSuccess: refresh,
  });
  return { upload, remove };
}
