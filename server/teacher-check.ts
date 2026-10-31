/**
 * The Teacher badge's school email link, server side (story S1-E2-11; the signed-link pattern of
 * ADR 0011).
 *
 * The one address, POST /api/teacher-check/link, with the person's own sign-in:
 * { schoolEmail, language }. It makes a random token (32 bytes), stores only its SHA-256 and the
 * address's domain through begin_teacher_email_check(), signed with TEACHER_CHECK_SECRET (so the
 * person never learns the token and can't confirm an address they don't hold), then emails the
 * school address the link /teacher-check/confirm#<token>. The token sits after "#", so it never
 * reaches a server log or a Referer header. The full address is used only to send the email and
 * is never stored (the story's proposal: keep only the domain).
 * Opening the link needs no server: the page calls confirm_teacher_email(token) itself, because
 * the token is the key.
 * No service key is used (CLAUDE.md rule 2), and nothing about the person or the email is logged
 * (rule 12). Who calls it: functions/api/teacher-check/[[path]].ts on Cloudflare,
 * server/pages-functions-plugin.ts locally; src/features/teacher-badge/api/teacherBadge.ts.
 */
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';
import {
  emailDomain,
  teacherLinkRequestSchema,
  type TeacherCheckLanguage,
  type TeacherLinkFailure,
} from '../src/schemas/teacherCheck';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { newConsentToken, userIdOf } from './parent-consent';
import { bearerToken } from './picture-check';
import { textOf } from './send-email';
import { hmacHex } from './signup-context';

/** What the handler needs from its surroundings. */
export interface TeacherCheckOptions {
  supabaseUrl: string;
  anonKey: string;
  /** TEACHER_CHECK_SECRET; the same value is in Vault as teacher_check_secret. */
  secret: string | undefined;
  sender: EmailSender;
  productName: string;
  companyName: string;
  sendEmail: SendEmail;
  readOverrides: (locale: string) => Promise<Map<string, string>>;
}

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The bundled default texts. */
const defaultTexts: Record<TeacherCheckLanguage, EmailTexts> = {
  ro: romanianEmail,
  en: englishEmail,
};

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<TeacherLinkFailure, number> = {
  signed_out: 401,
  invalid: 400,
  personal_address: 422,
  not_available: 409,
  too_soon: 429,
  unavailable: 503,
};

/** The database hints a refused request maps to. */
const failureForHint: Record<string, TeacherLinkFailure> = {
  personal_address: 'personal_address',
  not_available: 'not_available',
  too_soon: 'too_soon',
};

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
function fail(failure: TeacherLinkFailure): Response {
  return json({ error: failure }, statusForFailure[failure]);
}

/**
 * Stores the signed request as the person (their token), so auth.uid() is theirs.
 *
 * @returns the link's expiry, or the failure the database's hint maps to
 */
async function storeRequest(
  options: TeacherCheckOptions & { secret: string },
  accessToken: string,
  request: { userId: string; domain: string; hash: string },
): Promise<{ expiresAt: string } | { failure: TeacherLinkFailure }> {
  const signature = await hmacHex(
    `teacher|${request.userId}|${request.domain}|${request.hash}`,
    options.secret,
  );
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/begin_teacher_email_check`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ school_domain: request.domain, token_hash: request.hash, signature }),
  }).catch(() => null);
  if (response === null) return { failure: 'unavailable' };
  const parsed = (await response.json().catch(() => null)) as {
    link_expires_at?: string;
    hint?: string;
  } | null;
  if (response.ok && typeof parsed?.link_expires_at === 'string') {
    return { expiresAt: parsed.link_expires_at };
  }
  return { failure: failureForHint[parsed?.hint ?? ''] ?? 'unavailable' };
}

/**
 * Writes the email with the link, in the person's language, with the admins' wording laid over
 * the file text ("email:teacherCheck.*" overrides, S1-E11-19; {{link}} is locked in the editor).
 *
 * @returns the email, ready to send
 */
async function linkEmail(
  options: TeacherCheckOptions,
  to: string,
  language: TeacherCheckLanguage,
  link: string,
): Promise<OutgoingEmail> {
  const overrides = await options.readOverrides(language).catch(() => new Map<string, string>());
  const names = { productName: options.productName, companyName: options.companyName };
  const read = (path: string) =>
    textOf(defaultTexts[language], overrides, path, names).split('{{link}}').join(link);
  const lines = ['teacherCheck.linkBody', 'teacherCheck.linkAction', 'teacherCheck.linkNotYou'];
  const text = [...lines.map(read), read('signOff'), read('madeBy')].join('\n\n');
  return { to, subject: read('teacherCheck.linkSubject'), text };
}

/**
 * POST link: a new school email link.
 *
 * @returns { sent: true, expiresAt }, or { error } with its status
 */
async function sendLink(
  request: Request,
  options: TeacherCheckOptions & { secret: string },
): Promise<Response> {
  // Step 1: the person's own sign-in and a valid address and language.
  const accessToken = bearerToken(request);
  const userId = accessToken === null ? null : userIdOf(accessToken);
  if (accessToken === null || userId === null) return fail('signed_out');
  const parsed = teacherLinkRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid');
  const { schoolEmail, language } = parsed.data;
  // Step 2: a token the person never sees; the database keeps only its hash and the domain.
  const { token, hash } = await newConsentToken();
  const stored = await storeRequest(options, accessToken, {
    userId,
    domain: emailDomain(schoolEmail),
    hash,
  });
  if ('failure' in stored) return fail(stored.failure);
  // Step 3: the email with the link; the token goes after "#".
  const link = `${new URL(request.url).origin}/teacher-check/confirm#${token}`;
  const email = await linkEmail(options, schoolEmail, language, link);
  const isSent = await options.sendEmail(email, options.sender).then(
    () => true,
    () => false,
  );
  return isSent ? json({ sent: true, expiresAt: stored.expiresAt }, 200) : fail('unavailable');
}

/**
 * Answers every /api/teacher-check/ address.
 *
 * @param request - the request
 * @param options - the database, the secret and the email sender
 * @returns the answer; 404 for an unknown address; 503 without the secret
 * Errors: none thrown; nothing is logged.
 */
export async function handleTeacherCheck(
  request: Request,
  options: TeacherCheckOptions,
): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/^\/api\/teacher-check\//, '');
  // Step 1: without the secret nothing can be signed.
  if (!options.secret) return fail('unavailable');
  // Step 2: the address.
  if (request.method === 'POST' && path === 'link') {
    return sendLink(request, { ...options, secret: options.secret });
  }
  return json({ error: 'not_found' }, 404);
}
