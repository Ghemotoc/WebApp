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
 *   gets the parent a confirmation (criteria 2, 3 and 5).
 * No service key is used (CLAUDE.md rule 2), and nothing about the people or the emails is logged
 * (rule 12). Who calls it: functions/api/parent-consent/[[path]].ts on Cloudflare,
 * server/pages-functions-plugin.ts locally; src/features/parent-consent/ calls both addresses.
 */
import {
  consentAnswerSchema,
  consentRequestSchema,
  type ConsentAnswer,
  type ConsentFailure,
  type ConsentLanguage,
} from '../src/schemas/parentConsent';

import type { EmailSender, SendEmail } from './contact';
import { consentDate, consentEmail, type ConsentEmailKind } from './parent-consent/emails';
import { bearerToken } from './picture-check';
import { hmacHex } from './signup-context';

/** What the handler needs from its surroundings. */
export interface ParentConsentOptions {
  supabaseUrl: string;
  anonKey: string;
  /** PARENTAL_CONSENT_SECRET; the same value is in Vault as parental_consent_secret. */
  secret: string | undefined;
  sender: EmailSender;
  productName: string;
  companyName: string;
  sendEmail: SendEmail;
  readOverrides: (locale: string) => Promise<Map<string, string>>;
}

/** The options once the secret is known to be there. */
type ReadyOptions = ParentConsentOptions & { secret: string };

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<ConsentFailure, number> = {
  signed_out: 401,
  invalid: 400,
  own_email: 409,
  too_soon: 429,
  not_needed: 409,
  gone: 404,
  already_answered: 409,
  unavailable: 503,
};

/** What a database call gives back: the answer, or Postgres's hint when it refused. */
interface DatabaseAnswer<T> {
  data: T | null;
  hint: string | null;
}

/** What answer_parental_consent() answers. */
interface StoredAnswer {
  outcome: 'ok' | 'gone' | 'already_answered';
  writer_email?: string;
  writer_language?: string;
  handle?: string;
  parent_email?: string;
}

/**
 * A JSON answer that no cache keeps.
 *
 * @returns the response
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * A failure as JSON, with its status.
 *
 * @returns the response
 */
function fail(failure: ConsentFailure): Response {
  return json({ error: failure }, statusForFailure[failure]);
}

/**
 * Calls one database function, as the writer (their token) or as a visitor (the anon key).
 *
 * @returns the answer, or the hint Postgres gave with a refusal; both null when unreachable
 */
async function callDatabase<T>(
  options: ParentConsentOptions,
  name: string,
  body: Record<string, unknown>,
  token: string | null,
): Promise<DatabaseAnswer<T>> {
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${token ?? options.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null) return { data: null, hint: null };
  const parsed = (await response.json().catch(() => null)) as unknown;
  if (response.ok) return { data: parsed as T, hint: null };
  const hint = (parsed as { hint?: unknown } | null)?.hint;
  return { data: null, hint: typeof hint === 'string' ? hint : 'refused' };
}

/**
 * A new link token: 32 random bytes as base64url, and its SHA-256 in hex.
 *
 * @returns the token for the email and the hash for the database
 */
export async function newConsentToken(): Promise<{ token: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return { token, hash: await sha256Hex(token) };
}

/**
 * The SHA-256 of a text, in hex, as Postgres's digest() writes it.
 *
 * @returns the hash
 */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The user ID inside a sign-in token. Not checked here: the database checks the token itself
 * and acts as auth.uid(), so a forged ID only makes the signature fail.
 *
 * @returns the ID, or null when the token can't be read
 */
export function userIdOf(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (payload === undefined) return null;
  try {
    const text = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    const sub = (JSON.parse(text) as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Writes and sends one consent email.
 *
 * @returns true when it left
 */
async function sendConsentEmail(
  options: ReadyOptions,
  kind: ConsentEmailKind,
  to: string,
  details: { language: ConsentLanguage; values: Record<string, string> },
): Promise<boolean> {
  const overrides = await options
    .readOverrides(details.language)
    .catch(() => new Map<string, string>());
  const email = consentEmail(kind, to, details.values, {
    language: details.language,
    overrides,
    productName: options.productName,
    companyName: options.companyName,
  });
  return options.sendEmail(email, options.sender).then(
    () => true,
    () => false,
  );
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
  const kind = answer.decision === 'agree' ? 'agreed' : 'withdrawn';
  const date = consentDate(new Date().toISOString(), answer.language);
  await sendConsentEmail(options, kind, stored.parent_email, {
    language: answer.language,
    values: { handle, link, date },
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
  const signature = await hmacHex(`answer|${hash}|${answer.decision}`, options.secret);
  const stored = await callDatabase<StoredAnswer>(
    options,
    'answer_parental_consent',
    { token: answer.token, decision: answer.decision, page_language: answer.language, signature },
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
  return json({ error: 'not_found' }, 404);
}
