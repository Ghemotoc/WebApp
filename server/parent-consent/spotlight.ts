/**
 * The parent's separate yes to suggestions, server side (story S1-E2-03b, bundle LOOK-4c;
 * Robert, 6 Nov 2026, D4: under-16s are suggested to other people only with their parent's
 * expressed consent; GDPR art. 7 and 8: a separate, specific consent, as easy to withdraw).
 *
 * The addresses, both under /api/parent-consent/:
 * - POST spotlight-request, with the writer's own sign-in and no body: a 13 to 15-year-old whose
 *   parent already agreed to the account, and who switched "Suggest me" on, asks that parent.
 *   Makes a random token, stores only its SHA-256 through begin_spotlight_request() signed with
 *   PARENTAL_CONSENT_SECRET (so the child can't make their own link), then emails the parent the
 *   link /parent-consent/spotlight#<token>. At most one email an hour (hint too_soon);
 * - POST spotlight-answer, with no sign-in: { token, decision: agree | withdraw, language }. Signs
 *   the answer for answer_spotlight_consent(), then sends the parent a confirmation. The writer is
 *   told in the app by the database. The consent email's own link works here too, so a parent who
 *   ticked the box on the consent page can take back only that yes.
 * No service key is used (CLAUDE.md rule 2) and nothing about the people is logged (rule 12).
 * Who calls it: handleParentConsent() in server/parent-consent.ts. What it calls: the two
 * database functions above and the shared consent email (./emails.ts).
 */
import { spotlightAnswerSchema, type ConsentLanguage } from '../../src/schemas/parentConsent';
import { bearerToken } from '../picture-check';
import { hmacHex } from '../signup-context';

import { consentDate } from './emails';
import {
  callDatabase,
  fail,
  json,
  newConsentToken,
  sendConsentEmail,
  sha256Hex,
  userIdOf,
  type ReadyOptions,
} from './shared';

/** What begin_spotlight_request() answers. */
interface StoredRequest {
  outcome: 'ok' | 'not_needed';
  parent_email?: string;
  language?: string;
  handle?: string;
}

/** What answer_spotlight_consent() answers. */
interface StoredSpotlightAnswer {
  outcome: 'ok' | 'gone' | 'already_answered';
  parent_email?: string;
  handle?: string;
}

/**
 * The language a parent's email goes out in: the one they used on the consent page.
 *
 * @returns ro or en
 */
function languageOf(language: string | undefined): ConsentLanguage {
  return language === 'en' ? 'en' : 'ro';
}

/**
 * POST spotlight-request: emails the parent the "may we suggest your child?" link.
 *
 * @returns { sent: true }, or { error } with its status (signed_out, not_needed, too_soon,
 *   unavailable)
 */
export async function requestSpotlight(request: Request, options: ReadyOptions): Promise<Response> {
  // Step 1: the writer's own sign-in.
  const accessToken = bearerToken(request);
  const userId = accessToken === null ? null : userIdOf(accessToken);
  if (accessToken === null || userId === null) return fail('signed_out');
  // Step 2: a token the writer never sees; the database keeps only its hash, signed by us.
  const { token, hash } = await newConsentToken();
  const signature = await hmacHex(`spotlight|${userId}|${hash}`, options.secret);
  const stored = await callDatabase<StoredRequest>(
    options,
    'begin_spotlight_request',
    { token_hash: hash, signature },
    accessToken,
  );
  if (stored.data === null) return fail(stored.hint === 'too_soon' ? 'too_soon' : 'unavailable');
  if (stored.data.outcome !== 'ok' || stored.data.parent_email === undefined) {
    return fail('not_needed');
  }
  // Step 3: the email, in the parent's language; the token goes after "#".
  const link = `${new URL(request.url).origin}/parent-consent/spotlight#${token}`;
  const isSent = await sendConsentEmail(options, 'spotlightRequest', stored.data.parent_email, {
    language: languageOf(stored.data.language),
    values: { handle: stored.data.handle ?? '', link },
  });
  return isSent ? json({ sent: true }, 200) : fail('unavailable');
}

/**
 * POST spotlight-answer: the parent's yes, or its withdrawal, from the one-question page.
 *
 * @returns { decision }, or { error } with its status (invalid, gone, already_answered,
 *   unavailable)
 */
export async function answerSpotlight(request: Request, options: ReadyOptions): Promise<Response> {
  // Step 1: a valid answer.
  const parsed = spotlightAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid');
  const answer = parsed.data;
  // Step 2: the signed answer, stored by the database, which tells the writer.
  const hash = await sha256Hex(answer.token);
  const signature = await hmacHex(`spotlight-answer|${hash}|${answer.decision}`, options.secret);
  const stored = await callDatabase<StoredSpotlightAnswer>(
    options,
    'answer_spotlight_consent',
    { token: answer.token, decision: answer.decision, signature },
    null,
  );
  if (stored.data === null) return fail('unavailable');
  if (stored.data.outcome !== 'ok') return fail(stored.data.outcome);
  // Step 3: the parent's confirmation, with the same link to change their mind. A failed email
  // doesn't undo the answer.
  if (stored.data.parent_email !== undefined) {
    const kind = answer.decision === 'agree' ? 'spotlightAgreed' : 'spotlightWithdrawn';
    await sendConsentEmail(options, kind, stored.data.parent_email, {
      language: answer.language,
      values: {
        handle: stored.data.handle ?? '',
        link: `${new URL(request.url).origin}/parent-consent/spotlight#${answer.token}`,
        date: consentDate(new Date().toISOString(), answer.language),
      },
    });
  }
  return json({ decision: answer.decision }, 200);
}
