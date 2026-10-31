/**
 * The plain message for a picture the upload refused (stories S1-E3-09 and S1-E3-11).
 *
 * Who uses it: PictureInsertDialog and DrawingInsertDialog, which show it under the form.
 * What it reads: the reason PictureUploadError carries (src/features/pictures/api/pictures.ts).
 */
import { PictureUploadError } from '@/features/pictures/api/pictures';

/**
 * Picks the message for a refused upload.
 *
 * @param error - what the upload threw
 * @returns the translation key and its values (common namespace)
 */
export function pictureFailureMessage(error: unknown): {
  key: string;
  values?: Record<string, number>;
} {
  if (!(error instanceof PictureUploadError)) return { key: 'pictures.failed.unreachable' };
  if (error.failure === 'too_many') {
    return { key: 'pictures.failed.too_many', values: { minutes: error.waitMinutes ?? 60 } };
  }
  return { key: `pictures.failed.${error.failure}` };
}
