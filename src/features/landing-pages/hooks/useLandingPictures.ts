/**
 * useLandingPictureStates and useLandingPictureUpload: the pictures of one landing page in the
 * editor (story S1-E11-14 criterion 5; bundle CONTESTS-13a2a).
 *
 * Who calls them: LandingEditorForm (the states, for the preview and each picture field) and
 * BlockPictureField (the upload). What they call: fetchLandingPictureStates() in
 * api/landingPages.ts and uploadLandingPicture() in pictures/api/pictures.ts.
 * Why the states are asked again: a picture waits for its check and then for a moderator, so
 * the editor reads the states every 15 seconds while one isn't ready, and stops once all are.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { uploadLandingPicture } from '@/features/pictures/api/pictures';

import { fetchLandingPictureStates } from '../api/staff/landingPagesAdmin';

/** How often the states are read again while a picture isn't ready. */
const recheckMilliseconds = 15 * 1000;

/**
 * The check state of every picture uploaded for one page.
 *
 * @param pageId - the page
 * @returns the query; data is the pictures by ID (empty while loading)
 */
export function useLandingPictureStates(pageId: string) {
  return useQuery({
    queryKey: ['landing-picture-states', pageId],
    retry: false,
    queryFn: async () => fetchLandingPictureStates(await requireClient(), pageId),
    // Ask again while any picture is still being checked or waits for a moderator.
    refetchInterval: (query) => {
      const views = Object.values(query.state.data ?? {});
      return views.some((view) => view.state !== 'visible' && view.state !== 'removed')
        ? recheckMilliseconds
        : false;
    },
  });
}

/**
 * Uploads one picture for a page and reads the states again.
 *
 * @param pageId - the page
 * @returns the mutation; resolves to the picture's ID and its status after the check
 */
export function useLandingPictureUpload(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => uploadLandingPicture(await requireClient(), { pageId, file }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['landing-picture-states', pageId] }),
  });
}
