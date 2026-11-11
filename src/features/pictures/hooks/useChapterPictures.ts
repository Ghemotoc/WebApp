/**
 * Hooks for pictures in chapters (story S1-E3-09): the writer's own pictures with their check
 * state, and one upload from the Insert picture dialog.
 *
 * Who calls them: the chapter editor's picture (ChapterPictureNodeView), the writer's preview
 * (ChapterPreviewDialog) and the Insert picture dialog (PictureInsertDialog).
 * What they call: ../api/pictures.ts fetchMyPictureStates() and uploadChapterPicture().
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchMyPictureStates, type PictureView } from '../api/pictures';
import { uploadChapterPicture, type ChapterPictureUpload } from '../api/pictureUploads';

/** While a picture is still being checked, look again this often (milliseconds). */
const checkingRefreshMilliseconds = 15 * 1000;

/** Signed addresses last 30 minutes (api/pictures.ts); read them again after 20. */
const addressRefreshMilliseconds = 20 * 60 * 1000;

/**
 * The caller's own pictures among the IDs, with a signed address for each.
 *
 * @param pictureIds - the pictures in the text, in any order
 * @returns pictures (by ID; empty until loaded) and whether the read failed
 */
export function useMyPictureStates(pictureIds: string[]) {
  const sortedIds = [...pictureIds].sort();
  const pictures = useQuery<Record<string, PictureView>>({
    queryKey: ['my-picture-states', sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: addressRefreshMilliseconds,
    queryFn: async () => fetchMyPictureStates(await requireClient(), sortedIds),
    // A picture still in its check changes on its own, so look often; otherwise read again before
    // the signed addresses run out.
    refetchInterval: (query) => {
      const views = Object.values(query.state.data ?? {});
      const anyChecking = views.some((view) => view.state === 'checking');
      return anyChecking ? checkingRefreshMilliseconds : addressRefreshMilliseconds;
    },
  });
  return { pictures: pictures.data ?? {}, loadFailed: pictures.isError };
}

/**
 * One chapter picture upload at a time.
 *
 * @returns upload(input) (a promise of the picture's ID and status), isUploading and the last error
 */
export function useChapterPictureUpload() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (upload: ChapterPictureUpload) =>
      uploadChapterPicture(await requireClient(), upload),
    onSuccess: () => {
      // The new picture's state shows in the editor and the preview.
      void queryClient.invalidateQueries({ queryKey: ['my-picture-states'] });
    },
  });
  return {
    upload: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
