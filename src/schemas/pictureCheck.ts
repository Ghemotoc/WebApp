/**
 * The picture check's contract: what the upload screens send to /api/picture-check and what comes
 * back (story S1-E10-05). Shared by the screens (src/features/pictures/) and the server
 * (server/picture-check.ts), so both check the same rules. Imported with a relative path because
 * Cloudflare's functions build doesn't know the "@/" alias.
 */
import { z } from 'zod';

import { Constants } from '../lib/database.types';

/** The longest original file name kept for the check (the stub reads it; nothing stores it). */
export const originalNameLimit = 200;

/** The request: which registered picture to check, and the file's own name for the stub. */
export const pictureCheckRequestSchema = z.object({
  pictureId: z.string().uuid(),
  originalName: z.string().max(originalNameLimit).default(''),
});

/** A checked request. */
export type PictureCheckRequest = z.infer<typeof pictureCheckRequestSchema>;

/** The answer: the picture's status after the check, from the generated enum (rule 14). */
export const pictureCheckResponseSchema = z.object({
  status: z.enum(Constants.public.Enums.picture_status),
});

/** A checked answer. */
export type PictureCheckResponse = z.infer<typeof pictureCheckResponseSchema>;
