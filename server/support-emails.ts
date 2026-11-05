/**
 * Support ticket emails, out and in (story S1-E11-13, part 13a; bundle ADMIN-2h2; criteria 1, 2,
 * 3 and the follow-up in 7).
 *
 * Out (handleSupportEmails): the database wakes POST /api/support-emails every minute while
 * emails are due (run_support_email_worker(), with the notification emails' worker key). The
 * handler claims them (support_email_worker_claim()), writes each in the person's language with
 * the admins' wording laid over email.json ("supportTickets"), sends it from the support inbox
 * with "[#1042]" in the subject, our own Message-ID and In-Reply-To/References pointing at the
 * person's last email, then marks what left (support_email_worker_mark_sent()). Part h3a adds the
 * polite email when a ticket left waiting for the person is solved automatically.
 * In (handleSupportInbound): Brevo's inbound parsing posts each email to the support inbox to
 * POST /api/support-inbound?key=<SUPPORT_INBOUND_KEY>. The handler checks the key, keeps only
 * the parts a ticket needs, signs them with SUPPORT_TICKET_SECRET (the same value is in Vault as
 * support_ticket_secret) and calls receive_support_email(), which threads it or starts a ticket.
 * OPEN, not chosen here (CLAUDE.md rule 13): which outside helpdesk, if any, takes over; it would
 * replace these two handlers, not the screens.
 * Never logged: addresses, subjects or words (CLAUDE.md rule 12).
 * Who calls it: functions/api/support-emails.ts and functions/api/support-inbound.ts on Cloudflare,
 * server/pages-functions-plugin.ts locally.
 */
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { fillPlaceholders } from './notification-emails';
import { textOf } from './send-email';
import { sameText } from './same-text';
import { hmacHex } from './signup-context';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The bundled default texts. */
const defaultTexts: Record<'ro' | 'en', EmailTexts> = { ro: romanianEmail, en: englishEmail };

/** Reads one text of the supportTickets group and fills its placeholders. */
type ReadText = (field: string, values?: Record<string, string | number>) => string;

/** One due email, as support_email_worker_claim() answers it. */
export interface ClaimedSupportEmail {
  email_id: string;
  kind: 'acknowledgement' | 'staff_reply' | 'auto_solved' | 'merged';
  to: string;
  language: string;
  both_languages: boolean;
  number: number;
  subject: string;
  body: string | null;
  message_token: string;
  in_reply_to: string | null;
  has_account: boolean;
  /** For a 'merged' email: the ticket the person's messages live in now (part h4a). */
  merged_into?: number | null;
}

/** What the outgoing handler needs from its surroundings. */
export interface SupportEmailOptions {
  supabaseUrl: string;
  anonKey: string;
  /** EMAIL_WORKER_KEY; without it nothing is sent (503). */
  workerKey: string | undefined;
  /** The support inbox: emails come from it and answers go back to it. */
  sender: EmailSender;
  productName: string;
  companyName: string;
  sendEmail: SendEmail;
  /** The live "email:" overrides of a locale; failures fall back to the file text. */
  readOverrides: (locale: string) => Promise<Map<string, string>>;
}

/** What the incoming handler needs from its surroundings. */
export interface SupportInboundOptions {
  supabaseUrl: string;
  anonKey: string;
  /** SUPPORT_INBOUND_KEY: the secret in the webhook address Brevo calls. */
  inboundKey: string | undefined;
  /** SUPPORT_TICKET_SECRET: signs each email for the database. */
  ticketSecret: string | undefined;
  now?: () => Date;
}

/** One email as receive_support_email() takes it. */
export interface IncomingSupportEmail {
  from: string;
  subject: string;
  text: string;
  messageId: string;
  /** In-Reply-To and References together: where our Message-ID shows up in an answer. */
  threadHeaders: string;
  /** True for an auto-reply or bulk mail, which gets no acknowledgement. */
  automatic: boolean;
}

/** A JSON answer that is never cached. */
function jsonAnswer(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Calls one database function with the public key; the function itself checks the worker key or
 * the signature.
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

/* ---------- Out ---------- */

/**
 * The domain our Message-IDs use: the support inbox's own, so they look like any of its emails.
 *
 * @param sender - the support inbox
 * @returns for example "themagiccoffin.com"
 */
function messageDomain(sender: EmailSender): string {
  return sender.email.split('@')[1] ?? 'localhost';
}

/**
 * The threading headers (RFC 5322 section 3.6.4): our own Message-ID, so an answer can quote it,
 * and the person's last email, so their mail app files ours beside it.
 *
 * @param claimed - the email
 * @param sender - the support inbox
 * @returns the headers
 */
export function threadingHeaders(
  claimed: ClaimedSupportEmail,
  sender: EmailSender,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Message-ID': `<${claimed.message_token}@${messageDomain(sender)}>`,
  };
  if (claimed.in_reply_to !== null && claimed.in_reply_to !== '') {
    headers['In-Reply-To'] = claimed.in_reply_to;
    headers.References = claimed.in_reply_to;
  }
  return headers;
}

/** The supportTickets texts each kind of email uses. */
const emailKeys: Record<ClaimedSupportEmail['kind'], { subject: string; inApp: string }> = {
  acknowledgement: { subject: 'acknowledgementSubject', inApp: 'acknowledgementInApp' },
  staff_reply: { subject: 'replySubject', inApp: 'replyInApp' },
  auto_solved: { subject: 'autoSolvedSubject', inApp: 'replyInApp' },
  merged: { subject: 'mergedSubject', inApp: 'replyInApp' },
};

/**
 * The first part of an email: the acknowledgement, the staff words with how to answer, the
 * note that a waiting ticket was solved (part h3a), or the new number after a merge (part h4a).
 *
 * @returns the paragraphs
 */
function mainParts(
  claimed: ClaimedSupportEmail,
  read: ReadText,
  values: Record<string, string | number>,
): string[] {
  if (claimed.kind === 'acknowledgement') return [read('acknowledgementBody', values)];
  if (claimed.kind === 'auto_solved') return [read('autoSolvedBody', values)];
  if (claimed.kind === 'merged') return [read('mergedBody', values)];
  return [claimed.body ?? '', read('replyHowToAnswer', values)];
}

/**
 * The body of one email in one language.
 *
 * @param claimed - the email
 * @param read - the text reader for the language
 * @param link - the person's ticket in the app ("" for someone without an account)
 * @returns the text
 */
function bodyIn(claimed: ClaimedSupportEmail, read: ReadText, link: string): string {
  const values = {
    number: claimed.number,
    subject: claimed.subject,
    link,
    mergedInto: claimed.merged_into ?? claimed.number,
  };
  const parts = mainParts(claimed, read, values);
  // Only someone with an account can open the ticket in the app.
  if (claimed.has_account) parts.push(read(emailKeys[claimed.kind].inApp, values));
  parts.push(read('safetyLine'), read('signOff'));
  return parts.join('\n\n');
}

/**
 * Writes one support email: Romanian first and then English for an email-only ticket whose
 * language we don't know, otherwise the person's language.
 *
 * @param claimed - the email
 * @param readers - a text reader per language
 * @param siteUrl - the site's address, for the link to the ticket
 * @param sender - the support inbox
 * @returns the email
 */
export function composeSupportEmail(
  claimed: ClaimedSupportEmail,
  readers: Record<'ro' | 'en', ReadText>,
  siteUrl: string,
  sender: EmailSender,
): OutgoingEmail {
  const main = claimed.language === 'en' ? readers.en : readers.ro;
  // After a merge the conversation lives under the ticket that stayed, so the link goes there.
  const linkNumber = claimed.merged_into ?? claimed.number;
  const link = claimed.has_account ? `${siteUrl}/support/${String(linkNumber)}` : '';
  const subjectKey = emailKeys[claimed.kind].subject;
  const bodies = [bodyIn(claimed, main, link)];
  // A staff answer is written once, in the language staff chose: only the acknowledgement doubles.
  if (claimed.both_languages && claimed.kind === 'acknowledgement') {
    bodies.push(bodyIn(claimed, readers.en, link));
  }
  return {
    to: claimed.to,
    subject: main(subjectKey, {
      number: claimed.number,
      subject: claimed.subject,
      mergedInto: linkNumber,
    }),
    text: bodies.join('\n\n— English —\n\n'),
    replyTo: sender.email,
    headers: threadingHeaders(claimed, sender),
  };
}

/**
 * The two text readers, with the admins' overrides read once each.
 *
 * @param options - where overrides come from, and the names
 * @returns a reader for Romanian and one for English
 */
async function readersFor(options: SupportEmailOptions): Promise<Record<'ro' | 'en', ReadText>> {
  const readerOf = async (locale: 'ro' | 'en'): Promise<ReadText> => {
    const overrides = await options.readOverrides(locale).catch(() => new Map<string, string>());
    return (field, values = {}) =>
      fillPlaceholders(
        textOf(defaultTexts[locale], overrides, `supportTickets.${field}`, options),
        values,
      );
  };
  return { ro: await readerOf('ro'), en: await readerOf('en') };
}

/**
 * Sends each email, carrying on past a failure.
 *
 * @returns the IDs of the emails that left
 */
async function sendEach(
  claimedEmails: ClaimedSupportEmail[],
  siteUrl: string,
  options: SupportEmailOptions,
): Promise<string[]> {
  const readers = await readersFor(options);
  const sentIds: string[] = [];
  for (const claimed of claimedEmails) {
    try {
      const email = composeSupportEmail(claimed, readers, siteUrl, options.sender);
      await options.sendEmail(email, options.sender);
      sentIds.push(claimed.email_id);
    } catch {
      // It stays due and is tried again once its claim runs out (at most 5 times).
    }
  }
  return sentIds;
}

/**
 * Answers POST /api/support-emails.
 *
 * @param request - the call from run_support_email_worker(), "Authorization: Bearer <worker key>"
 * @param options - the database, the key, the sender and how to send
 * @returns 200 with { sent, failed }; 401 for a wrong key; 503 when the key isn't set or the
 *   database can't be reached
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleSupportEmails(
  request: Request,
  options: SupportEmailOptions,
): Promise<Response> {
  // Step 1: only the database's own call, with the worker key.
  const workerKey = options.workerKey ?? '';
  if (workerKey === '') return jsonAnswer({ error: 'not_set_up' }, 503);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (given !== workerKey) return jsonAnswer({ error: 'not_allowed' }, 401);
  // Step 2: the due emails.
  const claim = await callDatabase(
    'support_email_worker_claim',
    { worker_key: workerKey, batch_size: 50 },
    options,
  );
  if (claim === null || !claim.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  const claimedEmails = (await claim.json()) as ClaimedSupportEmail[];
  // Step 3: send, then mark only what left.
  const sentIds = await sendEach(claimedEmails, new URL(request.url).origin, options);
  if (sentIds.length > 0) {
    const marked = await callDatabase(
      'support_email_worker_mark_sent',
      { worker_key: workerKey, email_ids: sentIds },
      options,
    );
    if (marked === null || !marked.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  }
  return jsonAnswer({ sent: sentIds.length, failed: claimedEmails.length - sentIds.length }, 200);
}

/* ---------- In ---------- */

/** One email as Brevo's inbound parsing posts it (only the parts used). */
interface BrevoInboundItem {
  From?: { Address?: string };
  Subject?: string;
  MessageId?: string;
  InReplyTo?: string;
  /** The answer without the quoted earlier emails, when Brevo could find it. */
  ExtractedMarkdownMessage?: string;
  RawTextBody?: string;
  Headers?: Record<string, string | string[] | undefined>;
}

/**
 * One header's value as text, whatever shape Brevo gave it.
 *
 * @returns the value, or "" when it is missing
 */
function headerText(headers: BrevoInboundItem['Headers'], name: string): string {
  const entry = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  const value = entry?.[1];
  if (Array.isArray(value)) return value.join(' ');
  return value ?? '';
}

/**
 * Whether an email was sent by a machine (RFC 3834 Auto-Submitted, or Precedence bulk, list or
 * junk), so it gets no acknowledgement and two auto-responders can't answer each other forever.
 *
 * @returns true for an automatic email
 */
export function isAutomaticEmail(headers: BrevoInboundItem['Headers']): boolean {
  const autoSubmitted = headerText(headers, 'Auto-Submitted').trim().toLowerCase();
  const precedence = headerText(headers, 'Precedence').trim().toLowerCase();
  if (autoSubmitted !== '' && autoSubmitted !== 'no') return true;
  return ['bulk', 'list', 'junk', 'auto_reply'].includes(precedence);
}

/**
 * Keeps only what a ticket needs from one Brevo item.
 *
 * @param item - one entry of Brevo's "items"
 * @returns the email, or null when it has no sender
 */
export function incomingFromBrevo(item: BrevoInboundItem): IncomingSupportEmail | null {
  const from = (item.From?.Address ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) return null;
  const extracted = (item.ExtractedMarkdownMessage ?? '').trim();
  return {
    from,
    subject: item.Subject ?? '',
    text: extracted === '' ? (item.RawTextBody ?? '') : extracted,
    messageId: item.MessageId ?? '',
    threadHeaders: [item.InReplyTo ?? '', headerText(item.Headers, 'References')].join(' ').trim(),
    automatic: isAutomaticEmail(item.Headers),
  };
}

/**
 * Signs and saves one email.
 *
 * @returns true when the database took it
 */
async function saveIncoming(
  email: IncomingSupportEmail,
  secret: string,
  sentAt: Date,
  options: SupportInboundOptions,
): Promise<boolean> {
  const payload = JSON.stringify({ ...email, sentAt: sentAt.toISOString() });
  const signature = await hmacHex(payload, secret);
  const response = await callDatabase('receive_support_email', { payload, signature }, options);
  return response !== null && response.ok;
}

/**
 * Checks the webhook is set up and called with our key.
 *
 * @returns the signing secret, or the error answer to give
 */
function checkInboundCall(
  request: Request,
  options: SupportInboundOptions,
): { secret: string } | { refusal: Response } {
  const inboundKey = options.inboundKey ?? '';
  const secret = options.ticketSecret ?? '';
  if (inboundKey === '' || secret === '') {
    return { refusal: jsonAnswer({ error: 'not_set_up' }, 503) };
  }
  const given = new URL(request.url).searchParams.get('key') ?? '';
  if (!sameText(given, inboundKey)) return { refusal: jsonAnswer({ error: 'not_allowed' }, 401) };
  return { secret };
}

/**
 * Saves each email in turn. One the database refuses stops the run, so Brevo sends them all
 * again; the database drops the ones it already saved by their Message-ID.
 *
 * @returns how many were saved, or null when the database refused one
 */
async function saveAll(
  emails: (IncomingSupportEmail | null)[],
  secret: string,
  options: SupportInboundOptions,
): Promise<number | null> {
  const sentAt = (options.now ?? (() => new Date()))();
  let received = 0;
  for (const email of emails) {
    if (email === null) continue;
    if (!(await saveIncoming(email, secret, sentAt, options))) return null;
    received += 1;
  }
  return received;
}

/**
 * Answers POST /api/support-inbound?key=….
 *
 * @param request - Brevo's inbound parsing call: { items: [...] }
 * @param options - the database, the webhook key and the signing secret
 * @returns 200 { received, skipped }; 401 for a wrong key; 400 for a body that isn't Brevo's;
 *   503 when the keys aren't set or the database can't be reached, so Brevo tries again
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleSupportInbound(
  request: Request,
  options: SupportInboundOptions,
): Promise<Response> {
  // Step 1: set up, and the key in the address is ours.
  const checked = checkInboundCall(request, options);
  if ('refusal' in checked) return checked.refusal;
  // Step 2: Brevo's shape.
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  if (body === null || !Array.isArray(body.items)) return jsonAnswer({ error: 'bad_body' }, 400);
  // Step 3: each email that has a sender.
  const emails = (body.items as BrevoInboundItem[]).map(incomingFromBrevo);
  const received = await saveAll(emails, checked.secret, options);
  if (received === null) return jsonAnswer({ error: 'unavailable' }, 503);
  return jsonAnswer({ received, skipped: emails.length - received }, 200);
}
