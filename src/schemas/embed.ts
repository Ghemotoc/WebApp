/**
 * The music and video card contract: what the Add music or video dialog sends to /api/embed and
 * what comes back (story S1-E3-10). Shared by the editor (src/features/writing/) and the server
 * (server/embeds.ts), so both check the same rules. Imported with a relative path because
 * Cloudflare's functions build doesn't know the "@/" alias.
 */
import { z } from 'zod';

import { Constants } from '../lib/database.types';

/** The request: which chapter, and the link the writer pasted. */
export const embedRequestSchema = z.object({
  chapterId: z.string().uuid(),
  link: z.string().trim().min(1).max(500),
});

/** A checked request. */
export type EmbedRequest = z.infer<typeof embedRequestSchema>;

/** The answer for a card that was added. */
export const embedResponseSchema = z.object({
  embedId: z.string().uuid(),
  service: z.enum(Constants.public.Enums.embed_service),
  mediaPath: z.string(),
  title: z.string().nullable(),
  authorName: z.string().nullable(),
});

/** A checked answer. */
export type EmbedResponse = z.infer<typeof embedResponseSchema>;

/**
 * Why a card wasn't added, as the dialog explains it:
 * not_allowed (the link isn't from an allowed service), not_found (the service says there is no
 * such song or video, or it is private), switched_off (media_embeds is off), account (the account
 * may not write), chapter_not_found, too_many (the hourly limit; waitMinutes says how long),
 * unreachable (our server or the service didn't answer), signed_out and invalid.
 */
export const embedFailures = [
  'not_allowed',
  'not_found',
  'switched_off',
  'account',
  'chapter_not_found',
  'too_many',
  'unreachable',
  'signed_out',
  'invalid',
] as const;

/** One of the reasons above. */
export type EmbedFailure = (typeof embedFailures)[number];

/** The answer for a card that wasn't added. */
export const embedFailureSchema = z.object({
  error: z.enum(embedFailures),
  waitMinutes: z.number().int().positive().optional(),
});
