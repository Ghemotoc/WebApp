/**
 * Parental consent's server side (story S1-E2-03; ADR 0011; GDPR art. 8).
 *
 * The addresses, both under /api/parent-consent/:
 * - POST request, with the writer's own sign-in: { parentEmail, language }. Makes a random token
 *   (32 bytes), stores only its SHA-256 through begin_parental_consent() signed with
 *   PARENTAL_CONSENT_SECRET (so the writer never learns the token and can't agree for
 *   themselves), then emails the parent the link /parent-consent/answer#<token>. The token sits
 *   after "#", so it never reaches a server log or a Referer header (criterion 1);
 * - POST answer, with no sign-in: { token, decision, language, isGuardian }. Signs the answer for
 *   answer_parental_consent(), then sends what follows: a yes gets the parent a confirmation with
 *   the link to withdraw; a no gets the writer an email (their account is erased); a withdrawal
 *   gets the parent a confirmation (criteria 2, 3 and 5). With a yes, the parent may also tick
 *   the separate box allowing suggestions (S1-E2-03b);
 * - POST spotlight-request and POST spotlight-answer: the parent's separate yes to suggestions,
 *   asked later by a 13 to 15-year-old (server/parent-consent/spotlight.ts, story S1-E2-03b).
 * No service key is used (CLAUDE.md rule 2), and nothing about the people or the emails is logged
 * (rule 12). Who calls it: functions/api/parent-consent/[[path]].ts on Cloudflare,
 * server/pages-functions-plugin.ts locally; src/features/parent-consent/ calls both addresses.
 */
import {
  consentAnswerSchema,
  consentRequestSchema,
  type ConsentAnswer,
  type ConsentFailure,
} from '../src/schemas/parentConsent';

import { consentDate, type ConsentEmailKind } from './parent-consent/emails';
import {
  callDatabase,
  fail,
  json,
  newConsentToken,
  sendConsentEmail,
  sha256Hex,
  userIdOf,
  type ParentConsentOptions,
  type ReadyOptions,
} from './parent-consent/shared';
import { answerSpotlight, requestSpotlight } from './parent-consent/spotlight';
import { bearerToken } from './picture-check';
import { hmacHex } from './signup-context';

/** Kept here for the callers that import them from this file. */
export { newConsentToken, sha256Hex, userIdOf, type ParentConsentOptions };

/** What answer_parental_consent() answers. */
interface StoredAnswer {
  outcome: 'ok' | 'gone' | 'already_answered';
  writer_email?: string;
  writer_language?: string;
  handle?: string;
  parent_email?: string;
  /** True when the yes came with the separate suggestions box ticked (S1-E2-03b). */
  allow_spotlight?: boolean;
}

/**
 * The failure a refused request maps to.
 *
 * @returns own_email, too_soon or unavailable
 */
function requestFailureOf(hint: string | null): ConsentFailure {
  if (hint === 'own_email' || hint === 'too_soon') return hint;
  return 'unavailable';
}

/**
 * POST request: a new link to a parent or guardian.
 *
 * @returns { sent: true }, or { error } with its status
 */
async function requestConsent(request: Request, options: ReadyOptions): Promise<Response> {
  // Step 1: the writer's own sign-in and a valid email and language.
  const accessToken = bearerToken(request);
  const userId = accessToken === null ? null : userIdOf(accessToken);
  if (accessToken === null || userId === null) return fail('signed_out');
  const parsed = consentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid');
  const { parentEmail, language } = parsed.data;
  // Step 2: a token the writer never sees; the database keeps only its hash, signed.
  const { token, hash } = await newConsentToken();
  const signature = await hmacHex(
    `consent|${userId}|${parentEmail}|${language}|${hash}`,
    options.secret,
  );
  const stored = await callDatabase<{ outcome: string; handle: string; deadline: string }>(
    options,
    'begin_parental_consent',
    { parent_email: parentEmail, language, token_hash: hash, signature },
    accessToken,
  );
  if (stored.data === null) return fail(requestFailureOf(stored.hint));
  if (stored.data.outcome !== 'ok') return fail('not_needed');
  // Step 3: the email with the link; the token goes after "#".
  const link = `${new URL(request.url).origin}/parent-consent/answer#${token}`;
  const isSent = await sendConsentEmail(options, 'request', parentEmail, {
    language,
    values: {
      handle: stored.data.handle,
      link,
      deadline: consentDate(stored.data.deadline, language),
    },
  });
  return isSent ? json({ sent: true }, 200) : fail('unavailable');
}

/**
 * Which confirmation a parent gets after a yes or a withdrawal.
 *
 * @returns agreedSpotlight after a yes with the suggestions box ticked, otherwise agreed or withdrawn
 */
function followUpKindOf(
  decision: ConsentAnswer['decision'],
  allowSpotlight: boolean,
): ConsentEmailKind {
  if (decision !== 'agree') return 'withdrawn';
  return allowSpotlight ? 'agreedSpotlight' : 'agreed';
}

/**
 * Sends the email that follows an answer. A failed email doesn't undo the answer.
 *
 * @returns nothing; the answer is already stored
 */
async function sendFollowUp(
  options: ReadyOptions,
  answer: ConsentAnswer,
  stored: StoredAnswer,
  link: string,
): Promise<void> {
  const handle = stored.handle ?? '';
  if (answer.decision === 'refuse' && stored.writer_email !== undefined) {
    const writerLanguage = stored.writer_language === 'en' ? 'en' : 'ro';
    await sendConsentEmail(options, 'refused', stored.writer_email, {
      language: writerLanguage,
      values: { handle },
    });
    return;
  }
  if (stored.parent_email === undefined) return;
  const kind = followUpKindOf(answer.decision, stored.allow_spotlight === true);
  const date = consentDate(new Date().toISOString(), answer.language);
  // The consent link also opens the one-question suggestions page, to take back only that yes.
  const spotlightLink = link.replace('/parent-consent/answer#', '/parent-consent/spotlight#');
  await sendConsentEmail(options, kind, stored.parent_email, {
    language: answer.language,
    values: { handle, link, date, spotlightLink },
  });
}

/**
 * POST answer: the parent's yes, no or withdrawal, from the link.
 *
 * @returns { decision }, or { error } with its status
 */
async function answerConsent(request: Request, options: ReadyOptions): Promise<Response> {
  // Step 1: a valid answer; a yes needs the guardian box ticked.
  const parsed = consentAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid');
  const answer = parsed.data;
  // Step 2: the signed answer, stored by the database.
  const hash = await sha256Hex(answer.token);
  // The separate suggestions box counts only with a yes, and is part of what we sign (S1-E2-03b).
  const allowSpotlight = answer.decision === 'agree' && answer.allowSpotlight;
  const message = `answer|${hash}|${answer.decision}${allowSpotlight ? '|spotlight' : ''}`;
  const signature = await hmacHex(message, options.secret);
  const stored = await callDatabase<StoredAnswer>(
    options,
    'answer_parental_consent',
    {
      token: answer.token,
      decision: answer.decision,
      page_language: answer.language,
      signature,
      allow_spotlight: allowSpotlight,
    },
    null,
  );
  if (stored.data === null) return fail('unavailable');
  if (stored.data.outcome !== 'ok') return fail(stored.data.outcome);
  // Step 3: the email that follows, then the answer for the page.
  const link = `${new URL(request.url).origin}/parent-consent/answer#${answer.token}`;
  await sendFollowUp(options, answer, stored.data, link);
  return json({ decision: answer.decision }, 200);
}

/**
 * Answers every /api/parent-consent/ address.
 *
 * @param request - the request
 * @param options - the database, the secret and the email sender
 * @returns the answer; 404 for an unknown address; 503 without the secret
 * Errors: none thrown; nothing is logged.
 */
export async function handleParentConsent(
  request: Request,
  options: ParentConsentOptions,
): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/^\/api\/parent-consent\//, '');
  const call = `${request.method} ${path}`;
  // Step 1: without the secret nothing can be signed.
  if (!options.secret) return fail('unavailable');
  const ready = { ...options, secret: options.secret };
  // Step 2: the address.
  if (call === 'POST request') return requestConsent(request, ready);
  if (call === 'POST answer') return answerConsent(request, ready);
  if (call === 'POST spotlight-request') return requestSpotlight(request, ready);
  if (call === 'POST spotlight-answer') return answerSpotlight(request, ready);
  return json({ error: 'not_found' }, 404);
}
