/**
 * A space's logo as React hooks (bundle G8b; story S1-E8-06).
 *
 * Who calls it: SpaceLogo (the header and the space cards draw it) and SpaceLogoCard (the settings
 * page changes it). What it calls: ../api/spaceLogo.ts. A change refreshes every space read, so the
 * header and the settings show the new logo's state at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import { fetchSpaceLogoView, setSpaceLogoPicture, uploadAndSetSpaceLogo } from '../api/spaceLogo';
import type { Space } from '../api/spaces';

import { spacesQueryKey } from './useSpaces';

/** Signed addresses last 30 minutes (pictures/api/pictures.ts); the view is asked for again after 20. */
const freshForMilliseconds = 20 * 60 * 1000;

/**
 * Follows the logo's signed address.
 *
 * @param space - the space
 * @returns the query: data is the view, or null when the space has no logo
 */
export function useSpaceLogoView(space: Space) {
  const picture = space.logoPicture;
  return useQuery({
    queryKey: [
      ...spacesQueryKey,
      'logo',
      space.slug,
      picture?.state ?? null,
      picture?.path ?? null,
    ],
    enabled: picture !== null,
    retry: false,
    staleTime: freshForMilliseconds,
    queryFn: async () => fetchSpaceLogoView(await requireClient(), space),
  });
}

/**
 * Uploads a new logo, or takes it off (the settings power).
 *
 * @param space - the space
 * @returns upload (file → the check's status), remove, and their mutations' states
 */
export function useSpaceLogoChange(space: Space) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
  const upload = useMutation({
    mutationFn: async (file: File) => uploadAndSetSpaceLogo(await requireClient(), space, file),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => setSpaceLogoPicture(await requireClient(), space.slug, null),
    onSuccess: refresh,
  });
  return { upload, remove };
}
