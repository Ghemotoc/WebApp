/**
 * The plain message for a Canva step that didn't work (story S1-E3-12).
 *
 * Who uses it: hooks/useCanvaStart.ts, hooks/useCanvaReturn.ts and CanvaSettingsSection.
 * What it reads: the reason a CanvaError carries (src/schemas/canva.ts) or, for the cover upload
 * after Return, the reason a PictureUploadError carries (pictureFailureMessage, S1-E3-09).
 */
import { pictureFailureMessage } from '@/features/writing/lib/pictureFailure';
import { PictureUploadError } from '@/features/pictures/api/pictures';

import { CanvaError } from '../api/canva';

/** A translation key (with its namespace) and its values. */
export interface CanvaMessage {
  key: string;
  values?: Record<string, number>;
}

/**
 * Picks the message for what went wrong.
 *
 * @param error - what a step threw
 * @returns the message
 */
export function canvaFailureMessage(error: unknown): CanvaMessage {
  if (error instanceof CanvaError) return { key: `writing:canva.failed.${error.failure}` };
  if (error instanceof PictureUploadError) {
    const picture = pictureFailureMessage(error);
    return { key: `common:${picture.key}`, values: picture.values };
  }
  return { key: 'writing:canva.failed.unreachable' };
}
