/**
 * The "Tell me when you open here" form's request, shared by the page and the server (bundle G5,
 * part a; story S1-E2-10; Robert, 7 Nov 2026, 11:57 UTC).
 *
 * Who uses it: src/features/auth/api/openingList.ts (the page sends it) and
 * server/opening-list.ts (POST /api/opening-list checks it before anything is saved).
 * The country normally comes from the connection on the server; countryCode is sent only when
 * the connection gave none and the visitor picked one. website and openedAt are the accessible
 * bot check, as on the public report form (src/schemas/notice.ts): no puzzle (WCAG 2.2, 3.3.8).
 */
import { z } from 'zod';

import { writtenLanguages } from './interfaceLanguages';

/** The languages the emails are written in (email.json). */
export const openingListLanguages = writtenLanguages;

/** One "tell me when you open here" request. */
export const openingListRequestSchema = z.object({
  /** The address to write to; the server keeps it in lower case. */
  email: z.string().trim().email().max(254),
  /** The country picked by the visitor, only when the connection gave none (ISO alpha-2). */
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  /** The language of the emails: the page's. */
  language: z.enum(openingListLanguages),
  /** The honeypot: a person never fills it (it is hidden), a bot does. */
  website: z.string().max(2000).optional(),
  /** When the form was opened (ms since 1970), so a form sent in under three seconds is a bot. */
  openedAt: z.number().int().nonnegative().optional(),
});

/** A checked request. */
export type OpeningListRequest = z.infer<typeof openingListRequestSchema>;
