/**
 * usePictureUpload: uploads one picture and keeps what the field should say about it (story
 * S1-E10-05).
 *
 * Who calls it: CoverUploadField (Story settings; avatars are drawn, not uploaded, since ADMIN-2g);
 * uploadOutcomeOf() also serves SignaturePictureControls (S1-E8-08).
 * What it calls: ../api/pictures.ts uploadPicture(), then refreshes the pictures on screen.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { type PictureBucket } from '../api/pictures';
import { PictureUploadError, uploadPicture } from '../api/pictureUploads';

/** What the field says after an upload. */
export type UploadOutcome =
  | { kind: 'uploaded'; path: string; status: string }
  | { kind: 'failed'; failure: PictureUploadError['failure']; waitMinutes: number | null };

/**
 * What an upload field says, from an upload mutation's result or error (for uploads that don't use
 * usePictureUpload, such as a space banner or a forum signature picture).
 *
 * @param status - the check's status after the upload, or undefined before one
 * @param error - the upload's error, or null
 * @returns the outcome, or null before any upload
 */
export function uploadOutcomeOf(
  status: string | undefined,
  error: Error | null,
): UploadOutcome | null {
  if (error !== null) {
    if (error instanceof PictureUploadError) {
      return { kind: 'failed', failure: error.failure, waitMinutes: error.waitMinutes };
    }
    return { kind: 'failed', failure: 'unreachable', waitMinutes: null };
  }
  return status === undefined ? null : { kind: 'uploaded', path: '', status };
}

/**
 * Keeps one upload at a time.
 *
 * @param target - the bucket, the folder (the story's ID for a cover) and the kind
 * @returns upload(file), the outcome and whether an upload is running
 */
export function usePictureUpload(target: {
  bucket: PictureBucket;
  folder: string | null;
  kind: 'cover';
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (file: File) => uploadPicture(await requireClient(), { ...target, file }),
    onSuccess: () => {
      // The new picture's state shows wherever the person's pictures are drawn.
      void queryClient.invalidateQueries({ queryKey: ['story-cover-picture'] });
    },
  });
  let outcome: UploadOutcome | null = null;
  if (mutation.data !== undefined) outcome = { kind: 'uploaded', ...mutation.data };
  if (mutation.error !== null) {
    const error = mutation.error;
    outcome =
      error instanceof PictureUploadError
        ? { kind: 'failed', failure: error.failure, waitMinutes: error.waitMinutes }
        : { kind: 'failed', failure: 'unreachable', waitMinutes: null };
  }
  return { upload: mutation.mutate, outcome, isUploading: mutation.isPending };
}
