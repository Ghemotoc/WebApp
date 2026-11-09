/**
 * What a space's picture upload field says after an upload (bundle FORUMS-2c, shared with the
 * logo in G8b).
 *
 * Who calls it: SpaceBannerPictureCard and SpaceLogoCard, which hand it to PictureUploadField.
 */
import { PictureUploadError } from '@/features/pictures/api/pictures';
import type { UploadOutcome } from '@/features/pictures/hooks/usePictureUpload';

/**
 * The upload field's outcome, from the upload's result or error.
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
    // A file or upload problem names itself; anything else reads as "couldn't reach us".
    if (error instanceof PictureUploadError) {
      return { kind: 'failed', failure: error.failure, waitMinutes: error.waitMinutes };
    }
    return { kind: 'failed', failure: 'unreachable', waitMinutes: null };
  }
  return status === undefined ? null : { kind: 'uploaded', path: '', status };
}
