/**
 * The public report form's contract: what /report sends to /api/notice and what comes back (story
 * S1-E10-02; DSA art. 16(2); Regulation (EU) 2021/784 art. 15). Shared by the form
 * (src/features/notices/) and the server (server/notice.ts), so both check the same rules.
 *
 * Two kinds travel here:
 * - a notice about content, from anyone: the exact address, why it is illegal, the notifier's
 *   name and email (optional only for child sexual content) and the good-faith statement;
 * - an authority's removal order: the address, the order's text or summary, the authority's name,
 *   its reference and an email for the acknowledgement. It never meets the bot check.
 * The reasons come from the generated database types (CLAUDE.md rule 14). Imported with a relative
 * path because Cloudflare's functions build doesn't know the "@/" alias.
 */
import { z } from 'zod';

import { Constants } from '../lib/database.types';

import { copySourceLimits } from './report';

/** The report reasons, the same list as the Report button (S1-E10-01). */
export const noticeReasons = Constants.public.Enums.report_reason;

/** One reason. */
export type NoticeReason = (typeof noticeReasons)[number];

/** The one reason a notifier may leave their name and email out (DSA art. 16(2)(c)). */
export const anonymousReason: NoticeReason = 'child_sexual_content';

/** Limits the database checks too (public_notices). */
export const noticeLimits = {
  url: 2000,
  explanation: 2000,
  name: 120,
  email: 254,
  authority: 200,
  orderReference: 120,
} as const;

/** The shortest time a person takes to fill the form; faster is a bot (the accessible check). */
export const minimumFillMilliseconds = 3000;

/** Fields both kinds share. */
const sharedFields = {
  contentUrl: z.string().trim().min(1).max(noticeLimits.url),
  explanation: z.string().trim().min(1).max(noticeLimits.explanation),
  language: z.enum(['ro', 'en']),
};

/** An email address, or nothing when the field was left empty. */
const optionalEmail = z
  .string()
  .trim()
  .max(noticeLimits.email)
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().email().optional())
  .optional();

/** An optional line of text, empty meaning nothing. */
function optionalText(longest: number) {
  return z
    .string()
    .trim()
    .max(longest)
    .transform((value) => (value === '' ? undefined : value))
    .optional();
}

/**
 * A notice about content.
 * - website: a honeypot; a person never fills it (it is hidden), a bot does.
 * - openedAt: when the form was opened (ms since 1970), so a form sent in under three seconds is
 *   treated as a bot without any puzzle (WCAG 2.2, 3.3.8: no puzzle only).
 */
export const contentNoticeSchema = z
  .object({
    kind: z.literal('notice'),
    reason: z.enum(noticeReasons),
    ...sharedFields,
    notifierName: optionalText(noticeLimits.name),
    notifierEmail: optionalEmail,
    goodFaith: z.literal(true),
    // "Copied from a published work" (S1-E10-08): where it was copied from, all optional.
    copySource: z
      .object({
        title: z.string().max(copySourceLimits.title).optional(),
        author: z.string().max(copySourceLimits.author).optional(),
        reference: z.string().max(copySourceLimits.reference).optional(),
        passage: z.string().max(copySourceLimits.passage).optional(),
      })
      .optional(),
    website: z.string().max(2000).optional(),
    openedAt: z.number().int().nonnegative().optional(),
  })
  .superRefine((notice, context) => {
    // DSA art. 16(2)(c): name and email, except for child sexual abuse reports.
    if (notice.reason === anonymousReason) return;
    if (notice.notifierName === undefined) {
      context.addIssue({ code: 'custom', path: ['notifierName'], message: 'name_missing' });
    }
    if (notice.notifierEmail === undefined) {
      context.addIssue({ code: 'custom', path: ['notifierEmail'], message: 'email_missing' });
    }
  });

/** An authority's removal order (Regulation (EU) 2021/784); never stopped by the bot check. */
export const removalOrderSchema = z.object({
  kind: z.literal('removal_order'),
  ...sharedFields,
  authorityName: z.string().trim().min(1).max(noticeLimits.authority),
  orderReference: optionalText(noticeLimits.orderReference),
  notifierEmail: z.string().trim().email().max(noticeLimits.email),
});

/** What the form sends: one of the two kinds. */
export const noticeRequestSchema = z.union([contentNoticeSchema, removalOrderSchema]);
export type NoticeRequest = z.infer<typeof noticeRequestSchema>;
export type ContentNotice = z.infer<typeof contentNoticeSchema>;
export type RemovalOrder = z.infer<typeof removalOrderSchema>;

/**
 * The answer: the reference to quote and the time of receipt (the order's acknowledgement must
 * say when it arrived). acknowledged is false when the email couldn't be sent; the notice is
 * saved either way.
 */
export const noticeResponseSchema = z.object({
  reference: z.string().regex(/^(N-\d{6}|TCO-\d{4,})$/),
  receivedAt: z.string(),
  acknowledged: z.boolean(),
});
export type NoticeResponse = z.infer<typeof noticeResponseSchema>;
