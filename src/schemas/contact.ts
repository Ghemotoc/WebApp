/**
 * The Contact us form's contract: what the form sends to /api/contact and what comes back (story
 * S1-E14-04; decided 23 Oct 2026, Q10). Shared by the form (src/features/contact/) and the
 * server (server/contact.ts), so both check the same rules (CLAUDE.md: zod schemas in
 * src/schemas/ shared with the server).
 */
import { z } from 'zod';

import { writtenLanguages } from './interfaceLanguages';

/** What a message can be about; the topic picks the subject line staff see. */
export const contactTopics = ['question', 'account', 'data_request', 'other'] as const;
export type ContactTopic = (typeof contactTopics)[number];

/** The message's limits (plain, generous; the reply comes by email). */
export const contactMessageMaxLength = 4000;

/**
 * What the form sends.
 * - email: required when signed out; for a signed-in person the account's email is sent too, as
 *   the reply-to address (Q10e), read from the session in the browser.
 * - handle: the signed-in person's username, so staff can find the account (the story's third
 *   criterion: the username and user ID go with the message, never the year of birth).
 * - website: a honeypot (Q10d): a real person never fills it (it is hidden); a bot does. Any
 *   text is accepted here, so the server can tell a bot apart without refusing it.
 */
export const contactRequestSchema = z.object({
  topic: z.enum(contactTopics),
  message: z.string().trim().min(1).max(contactMessageMaxLength),
  email: z.string().trim().email().max(254),
  language: z.enum(writtenLanguages),
  handle: z.string().trim().min(1).max(60).optional(),
  userId: z.string().uuid().optional(),
  website: z.string().max(2000).optional(),
});
export type ContactRequest = z.infer<typeof contactRequestSchema>;

/**
 * The answer: the reference the person quotes. Since S1-E11-13 it is the support ticket's number
 * (#1042); before the ticket secret is set it is the old reference, made by the function and not
 * stored (Q10c).
 */
export const contactResponseSchema = z.object({
  reference: z.string().regex(/^(C-\d{4}-\d{4}|#\d+)$/),
});
export type ContactResponse = z.infer<typeof contactResponseSchema>;
