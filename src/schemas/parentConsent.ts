/**
 * Parental consent's contract: what the writer's page and the parent's page send to
 * /api/parent-consent/… and what comes back (story S1-E2-03; ADR 0011), plus the parent's
 * separate yes to suggestions (story S1-E2-03b). Shared by the screens
 * (src/features/parent-consent/) and the server (server/parent-consent.ts), so both check the
 * same rules. Imported with a relative path because Cloudflare's functions build doesn't know the
 * "@/" alias.
 */
import { z } from 'zod';

import { writtenLanguages } from './interfaceLanguages';

/** The two languages a parent's email and page can be in. */
export const consentLanguages = writtenLanguages;
export type ConsentLanguage = (typeof consentLanguages)[number];

/** The writer asks: a parent's or guardian's email and the email's language (board 2.4). */
export const consentRequestSchema = z.object({
  parentEmail: z.string().trim().toLowerCase().email().max(254),
  language: z.enum(consentLanguages),
});

/** A checked request. */
export type ConsentRequest = z.infer<typeof consentRequestSchema>;

/** The three answers a parent can give from the link. */
export const consentDecisions = ['agree', 'refuse', 'withdraw'] as const;
export type ConsentDecision = (typeof consentDecisions)[number];

/** A link's token: 43 characters of base64url for 32 random bytes, with some room. */
const linkTokenSchema = z
  .string()
  .min(20)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

/**
 * The parent answers. Agreeing needs "I'm this child's parent or legal guardian" ticked; the
 * token is the one from the link. allowSpotlight is the separate, unticked box "You may also
 * suggest my child and their stories to other readers" (S1-E2-03b; GDPR art. 7: never bundled),
 * which counts only with a yes.
 */
export const consentAnswerSchema = z
  .object({
    token: linkTokenSchema,
    decision: z.enum(consentDecisions),
    language: z.enum(consentLanguages),
    isGuardian: z.boolean(),
    allowSpotlight: z.boolean().default(false),
  })
  .refine((answer) => answer.decision !== 'agree' || answer.isGuardian, {
    message: 'Tick that you are the parent or legal guardian first.',
    path: ['isGuardian'],
  });

/** A checked answer. */
export type ConsentAnswer = z.infer<typeof consentAnswerSchema>;

/** Why a request or an answer failed, as the screens show it. */
export const consentFailures = [
  'signed_out',
  'invalid',
  'own_email',
  'too_soon',
  'not_needed',
  'gone',
  'already_answered',
  'unavailable',
] as const;
export type ConsentFailure = (typeof consentFailures)[number];

/** A failed request or answer: one of the reasons above. */
export const consentFailureSchema = z.object({ error: z.enum(consentFailures) });

/** A successful answer: what the parent's page says next. */
export const consentAnswerResponseSchema = z.object({ decision: z.enum(consentDecisions) });

/** The two answers on the one-question suggestions page (S1-E2-03b). */
export const spotlightDecisions = ['agree', 'withdraw'] as const;
export type SpotlightDecision = (typeof spotlightDecisions)[number];

/**
 * The parent answers "May we suggest your child and their stories to other readers?". The token
 * is from the "may we suggest" email, or the consent email's own link.
 */
export const spotlightAnswerSchema = z.object({
  token: linkTokenSchema,
  decision: z.enum(spotlightDecisions),
  language: z.enum(consentLanguages),
});

/** A checked suggestions answer. */
export type SpotlightAnswer = z.infer<typeof spotlightAnswerSchema>;

/** A successful suggestions answer: what the page says next. */
export const spotlightAnswerResponseSchema = z.object({ decision: z.enum(spotlightDecisions) });
