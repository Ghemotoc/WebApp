/**
 * "Tell me when you open here": the server side of the list on the "not open in your country
 * yet" page (bundle G5, part a; story S1-E2-10; Robert, 7 Nov 2026, 11:57 UTC: "Tell me when you
 * open here", and when the country opens "the email goes out and people have 7 days to activate").
 *
 * Joining (handleOpeningList, POST /api/opening-list), in order:
 * 1. checks the request against the shared schema (src/schemas/openingList.ts);
 * 2. the accessible bot check: a hidden honeypot field and a minimum time to fill, no puzzle
 *    (WCAG 2.2, 3.3.8). A bot gets the same answer as a person and nothing is saved;
 * 3. the country: the connection's (Cloudflare), or the one the visitor picked when it gave none;
 * 4. signs the fields with NOTICE_SECRET (purpose "opening_list") and calls join_opening_list(),
 *    which keeps the address and hands back a one-time token, or none when no email should go;
 * 5. emails the confirm link, with a link to take the address off the list (GDPR art. 7). The
 *    token travels after "#", so it never reaches a server log.
 * The answer is the same whether or not an email went, so the form says nothing about who is on
 * the list.
 * The opening emails (handleOpeningEmails, POST /api/opening-emails): the database wakes us every
 * 5 minutes while emails are due (run_opening_email_worker(), with the notification emails'
 * worker key); we claim them, send "We're open in <country>" with a link to sign up, and mark what
 * left.
 * Texts: email.json "openingList", with the admins' wording laid over it (S1-E11-19).
 * Never logged: addresses, keys or tokens (CLAUDE.md rule 12).
 * Who calls it: functions/api/opening-list.ts and functions/api/opening-emails.ts on Cloudflare,
 * server/pages-functions-plugin.ts locally (emails go to Mailpit).
 */
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';
import { minimumFillMilliseconds } from '../src/schemas/notice';
import { openingListRequestSchema, type OpeningListRequest } from '../src/schemas/openingList';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { fillPlaceholders } from './notification-emails';
import { textOf } from './send-email';
import { hmacHex } from './signup-context';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The languages of these emails. */
type OpeningLanguage = 'ro' | 'en';

/** The bundled default texts. */
const defaultTexts: Record<OpeningLanguage, EmailTexts> = { ro: romanianEmail, en: englishEmail };

/** What both handlers need from their surroundings. */
interface SharedOptions {
  supabaseUrl: string;
  anonKey: string;
  /** Who the emails come from: the support inbox. */
  sender: EmailSender;
  productName: string;
  companyName: string;
  sendEmail: SendEmail;
  /** The live "email:" overrides of a locale; failures fall back to the file text. */
  readOverrides: (locale: string) => Promise<Map<string, string>>;
}

/** What the joining handler needs. */
export interface OpeningListOptions extends SharedOptions {
  /** NOTICE_SECRET; without it nothing can be saved (503). */
  secret: string | undefined;
  /** The country Cloudflare found for the connection, or null. */
  connectionCountry: string | null;
  now?: Date;
}

/** What the opening email worker needs. */
export interface OpeningEmailOptions extends SharedOptions {
  /** EMAIL_WORKER_KEY; without it nothing is sent (503). */
  workerKey: string | undefined;
}

/** One due opening email, as opening_email_worker_claim() answers it. */
export interface ClaimedOpeningEmail {
  id: string;
  to: string;
  country_code: string;
  language: string;
}

/** A JSON answer that is never cached. */
function jsonAnswer(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Calls one database function with the public key; the function itself checks the signature or
 * the worker key.
 *
 * @returns the response, or null when the database can't be reached
 */
function callDatabase(
  name: string,
  body: unknown,
  connection: { supabaseUrl: string; anonKey: string },
): Promise<Response | null> {
  return fetch(`${connection.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: connection.anonKey,
      Authorization: `Bearer ${connection.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
}

/**
 * Says whether a request looks like it came from a bot: the hidden field filled, or the form sent
 * faster than a person can.
 *
 * @param request - the checked request
 * @param now - the current time
 * @returns true for a bot
 */
export function looksLikeABot(request: OpeningListRequest, now: Date): boolean {
  if (request.website !== undefined && request.website !== '') return true;
  if (request.openedAt === undefined) return false;
  return now.getTime() - request.openedAt < minimumFillMilliseconds;
}

/**
 * The country's name in a language, for the emails ("France", "Franța").
 *
 * @param countryCode - ISO alpha-2
 * @param language - the email's language
 * @returns the name, or the code when the runtime doesn't know it
 */
export function countryNameIn(countryCode: string, language: OpeningLanguage): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

/**
 * A text reader for one language, with the admins' overrides read once.
 *
 * @returns a function that reads one "openingList" text and fills its placeholders
 */
async function readerFor(options: SharedOptions, language: OpeningLanguage) {
  const overrides = await options.readOverrides(language).catch(() => new Map<string, string>());
  const names = { productName: options.productName, companyName: options.companyName };
  return (path: string, values: Record<string, string> = {}) =>
    fillPlaceholders(textOf(defaultTexts[language], overrides, path, names), values);
}

/**
 * Writes the confirm email: why it came, the confirm link, what happens if it wasn't them, and
 * the link to leave the list.
 *
 * @returns the email, ready to send
 */
export async function confirmEmail(
  options: SharedOptions,
  to: string,
  language: OpeningLanguage,
  links: { country: string; confirmLink: string; removeLink: string },
): Promise<OutgoingEmail> {
  const read = await readerFor(options, language);
  const lines = ['confirmBody', 'confirmAction', 'confirmNotYou', 'confirmRemove'];
  const body = lines.map((line) => read(`openingList.${line}`, links));
  const text = [...body, read('signOff'), read('madeBy')].join('\n\n');
  return { to, subject: read('openingList.confirmSubject', links), text };
}

/**
 * Writes the opening email: the country is open, sign up within 7 days.
 *
 * @returns the email, ready to send
 */
export async function openingEmail(
  options: SharedOptions,
  claimed: ClaimedOpeningEmail,
  siteUrl: string,
): Promise<OutgoingEmail> {
  const language: OpeningLanguage = claimed.language === 'en' ? 'en' : 'ro';
  const read = await readerFor(options, language);
  const values = {
    country: countryNameIn(claimed.country_code, language),
    signUpLink: `${siteUrl}/sign-up`,
  };
  const lines = ['openBody', 'openAction', 'openOnce'];
  const body = lines.map((line) => read(`openingList.${line}`, values));
  const text = [...body, read('signOff'), read('madeBy')].join('\n\n');
  return { to: claimed.to, subject: read('openingList.openSubject', values), text };
}

/**
 * Saves the request through join_opening_list(), signed.
 *
 * @returns the token for the confirm email, null when no email should go, or 'invalid' /
 *   'already_open' / 'unavailable'
 */
async function joinList(
  request: OpeningListRequest,
  countryCode: string,
  options: OpeningListOptions & { secret: string },
): Promise<string | null | 'invalid' | 'already_open' | 'unavailable'> {
  const payload = JSON.stringify({
    purpose: 'opening_list',
    email: request.email,
    countryCode,
    detectedCountryCode: options.connectionCountry,
    language: request.language,
  });
  const response = await callDatabase(
    'join_opening_list',
    { payload, signature: await hmacHex(payload, options.secret) },
    options,
  );
  if (response === null) return 'unavailable';
  if (response.ok) return (await response.json()) as string | null;
  const problem = (await response.json().catch(() => null)) as { hint?: string } | null;
  if (problem?.hint === 'already_open') return 'already_open';
  // A check the table refused (an address the schema let through): the form says "check".
  if (response.status === 400) return 'invalid';
  return 'unavailable';
}

/** The answer for each way joinList() can fail. */
const joinFailureAnswers = {
  invalid: { body: { error: 'invalid' }, status: 400 },
  already_open: { body: { error: 'already_open' }, status: 409 },
  unavailable: { body: { error: 'unavailable' }, status: 503 },
} as const;

/**
 * Sends the confirm email for a new token. The token goes after "#", so no server log holds it.
 *
 * @param siteUrl - the site's address, for the links
 * @param wanted - the checked form, with the country used and the new token
 * @param options - the names, the texts and how to send
 * @returns 200 with { listed: true } once it left, 503 when it couldn't be sent
 */
async function sendConfirmEmail(
  siteUrl: string,
  wanted: OpeningListRequest & { countryCode: string; token: string },
  options: OpeningListOptions,
): Promise<Response> {
  const { countryCode, token } = wanted;
  const email = await confirmEmail(options, wanted.email, wanted.language, {
    country: countryNameIn(countryCode, wanted.language),
    confirmLink: `${siteUrl}/open-here/confirm#${token}`,
    removeLink: `${siteUrl}/open-here/remove#${token}`,
  });
  const isSent = await options.sendEmail(email, options.sender).then(
    () => true,
    () => false,
  );
  return isSent ? jsonAnswer({ listed: true }, 200) : jsonAnswer({ error: 'unavailable' }, 503);
}

/**
 * Answers POST /api/opening-list.
 *
 * @param request - the request with the form's JSON
 * @param options - the database, the secret, the country of the connection and how to send
 * @returns 200 with { listed: true } (the same whether or not an email went); 400 for a request
 *   that fails the checks or has no country; 409 when the country is open already; 503 when it
 *   can't be saved or the email can't be sent; a made-up 200 for a bot
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleOpeningList(
  request: Request,
  options: OpeningListOptions,
): Promise<Response> {
  // Step 1: the shared schema.
  const parsed = openingListRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonAnswer({ error: 'invalid' }, 400);
  const wanted = parsed.data;
  // Step 2: the bot check; a bot learns nothing.
  if (looksLikeABot(wanted, options.now ?? new Date())) return jsonAnswer({ listed: true }, 200);
  // Step 3: the country of the connection wins; the visitor picks only when there is none.
  const countryCode = options.connectionCountry ?? wanted.countryCode;
  if (countryCode === undefined) return jsonAnswer({ error: 'no_country' }, 400);
  // Step 4: saved and signed; without the secret nothing can be saved.
  const secret = options.secret ?? '';
  if (secret === '') return jsonAnswer({ error: 'unavailable' }, 503);
  const token = await joinList(wanted, countryCode, { ...options, secret });
  if (token === null) return jsonAnswer({ listed: true }, 200);
  if (token in joinFailureAnswers) {
    const failure = joinFailureAnswers[token as keyof typeof joinFailureAnswers];
    return jsonAnswer(failure.body, failure.status);
  }
  // Step 5: the confirm email.
  const siteUrl = new URL(request.url).origin;
  return sendConfirmEmail(siteUrl, { ...wanted, countryCode, token }, options);
}

/**
 * Sends each opening email, carrying on past a failure.
 *
 * @returns the IDs of the emails that left
 */
async function sendEach(
  claimedEmails: ClaimedOpeningEmail[],
  siteUrl: string,
  options: OpeningEmailOptions,
): Promise<string[]> {
  const sentIds: string[] = [];
  for (const claimed of claimedEmails) {
    try {
      await options.sendEmail(await openingEmail(options, claimed, siteUrl), options.sender);
      sentIds.push(claimed.id);
    } catch {
      // It stays due and is tried again once its claim runs out (at most 5 times).
    }
  }
  return sentIds;
}

/**
 * Answers POST /api/opening-emails.
 *
 * @param request - the call from run_opening_email_worker(), "Authorization: Bearer <worker key>"
 * @param options - the database, the key, the sender and how to send
 * @returns 200 with { sent, failed }; 401 for a wrong key; 503 when the key isn't set or the
 *   database can't be reached
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleOpeningEmails(
  request: Request,
  options: OpeningEmailOptions,
): Promise<Response> {
  // Step 1: only the database's own call, with the worker key.
  const workerKey = options.workerKey ?? '';
  if (workerKey === '') return jsonAnswer({ error: 'not_set_up' }, 503);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (given !== workerKey) return jsonAnswer({ error: 'not_allowed' }, 401);
  // Step 2: the due emails.
  const claim = await callDatabase(
    'opening_email_worker_claim',
    { worker_key: workerKey, batch_size: 50 },
    options,
  );
  if (claim === null || !claim.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  const claimedEmails = (await claim.json()) as ClaimedOpeningEmail[];
  // Step 3: send, then mark only what left.
  const sentIds = await sendEach(claimedEmails, new URL(request.url).origin, options);
  if (sentIds.length > 0) {
    const marked = await callDatabase(
      'opening_email_worker_mark_sent',
      { worker_key: workerKey, email_ids: sentIds },
      options,
    );
    if (marked === null || !marked.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  }
  return jsonAnswer({ sent: sentIds.length, failed: claimedEmails.length - sentIds.length }, 200);
}
