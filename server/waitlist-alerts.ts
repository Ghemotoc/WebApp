/**
 * The staff email for each new person on the waiting list (bundle WAITLIST-2, story S1-E2-24;
 * Robert, 21 Nov 2026, 06:59 UTC: people join the waiting list "and then I get the emails", and
 * 07:05 UTC: "yes, [the support address]. One per person.").
 *
 * How it works (handleWaitlistAlerts, POST /api/waitlist-alerts):
 * 1. the database wakes us every 5 minutes while an email is due (run_waitlist_alert_worker(),
 *    with the notification emails' worker key), so only a call with that key is answered;
 * 2. waitlist_alert_worker_claim() hands over the people who confirmed their email and wait, each
 *    with the mailbox setting (waitlist_alert_email);
 * 3. one email per person goes to that mailbox, or to the support address from the brand config
 *    when the setting is empty (CLAUDE.md, "Names and domains are
 *    settings, not code");
 * 4. waitlist_alert_worker_mark_sent() marks what left; a failed email stays due and is tried
 *    again, at most 5 times.
 * What the email holds: the username, country, answer and joining time, and a link to
 * Staff › Waitlist. Never the person's email address (GDPR art. 5(1)(c)).
 * Texts: email.json "waitlistAlert" in English, the staff's working language, with the admins'
 * wording laid over it (S1-E11-19).
 * Never logged: addresses or keys (CLAUDE.md rule 12).
 * Who calls it: functions/api/waitlist-alerts.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally (emails go to Mailpit).
 */
import englishEmail from '../src/locales/en/email.json';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { fillPlaceholders } from './notification-emails';
import { textOf } from './send-email';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** What the worker needs from its surroundings. */
export interface WaitlistAlertOptions {
  supabaseUrl: string;
  anonKey: string;
  /** EMAIL_WORKER_KEY; without it nothing is sent (503). */
  workerKey: string | undefined;
  /** Who the emails come from: the support inbox. It is also the mailbox when the setting is empty. */
  sender: EmailSender;
  productName: string;
  companyName: string;
  sendEmail: SendEmail;
  /** The live "email:" overrides of a locale; failures fall back to the file text. */
  readOverrides: (locale: string) => Promise<Map<string, string>>;
}

/** One due staff email, as waitlist_alert_worker_claim() answers it. */
export interface ClaimedWaitlistAlert {
  id: string;
  handle: string;
  country_code: string | null;
  interest: 'write' | 'read' | 'both';
  joined_at: string;
  /** The setting waitlist_alert_email; empty means the support address. */
  alert_to: string;
}

/** The text key for each answer to "write, read or both". */
const interestKeys: Record<ClaimedWaitlistAlert['interest'], string> = {
  write: 'waitlistAlert.interestWrite',
  read: 'waitlistAlert.interestRead',
  both: 'waitlistAlert.interestBoth',
};

/** A JSON answer that is never cached. */
function jsonAnswer(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Calls one worker function with the public key; the function itself checks the worker key.
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
 * Says where the email goes: the setting when it holds an address, otherwise the support inbox.
 *
 * @param alertTo - the setting waitlist_alert_email, as the claim carries it
 * @param sender - the support inbox
 * @returns the address
 */
export function alertMailbox(alertTo: string, sender: EmailSender): string {
  const trimmed = alertTo.trim();
  // A value without "@" is a typo in Staff › Settings: the support inbox is safer than nothing.
  return trimmed.includes('@') ? trimmed : sender.email;
}

/**
 * Names the country in English, or says it isn't known.
 *
 * @returns "Romania", or the "not known" text
 */
function countryName(countryCode: string | null, unknownText: string): string {
  if (countryCode === null || countryCode === '') return unknownText;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

/**
 * Writes the staff email about one new person on the list.
 *
 * @param options - the names, the overrides and the sender
 * @param claimed - the person, from the claim
 * @param siteUrl - the site's origin, for the Staff › Waitlist link
 * @returns the email, ready to send
 */
export async function waitlistAlertEmail(
  options: WaitlistAlertOptions,
  claimed: ClaimedWaitlistAlert,
  siteUrl: string,
): Promise<OutgoingEmail> {
  // Step 1: the English texts, with the admins' wording laid over them.
  const overrides = await options.readOverrides('en').catch(() => new Map<string, string>());
  const names = { productName: options.productName, companyName: options.companyName };
  const read = (path: string, values: Record<string, string> = {}) =>
    fillPlaceholders(textOf(englishEmail as EmailTexts, overrides, path, names), values);
  // Step 2: the facts, in the words staff read.
  const values = {
    handle: claimed.handle,
    country: countryName(claimed.country_code, read('waitlistAlert.countryUnknown')),
    interest: read(interestKeys[claimed.interest]),
    joinedAt: new Date(claimed.joined_at).toUTCString(),
    staffLink: `${siteUrl}/staff/waitlist`,
  };
  // Step 3: the email, one paragraph a part.
  const lines = ['body', 'details', 'action', 'why'];
  const body = lines.map((line) => read(`waitlistAlert.${line}`, values));
  return {
    to: alertMailbox(claimed.alert_to, options.sender),
    subject: read('waitlistAlert.subject', values),
    text: [...body, read('signOff')].join('\n\n'),
  };
}

/**
 * Sends each staff email, carrying on past a failure.
 *
 * @returns the entry IDs whose email left
 */
async function sendEach(
  claimedAlerts: ClaimedWaitlistAlert[],
  siteUrl: string,
  options: WaitlistAlertOptions,
): Promise<string[]> {
  const sentIds: string[] = [];
  for (const claimed of claimedAlerts) {
    try {
      await options.sendEmail(await waitlistAlertEmail(options, claimed, siteUrl), options.sender);
      sentIds.push(claimed.id);
    } catch {
      // It stays due and is tried again once its claim runs out (at most 5 times).
    }
  }
  return sentIds;
}

/**
 * Answers POST /api/waitlist-alerts.
 *
 * @param request - the call from run_waitlist_alert_worker(), "Authorization: Bearer <worker key>"
 * @param options - the database, the key, the sender and how to send
 * @returns 200 with { sent, failed }; 401 for a wrong key; 503 when the key isn't set or the
 *   database can't be reached
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleWaitlistAlerts(
  request: Request,
  options: WaitlistAlertOptions,
): Promise<Response> {
  // Step 1: only the database's own call, with the worker key.
  const workerKey = options.workerKey ?? '';
  if (workerKey === '') return jsonAnswer({ error: 'not_set_up' }, 503);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (given !== workerKey) return jsonAnswer({ error: 'not_allowed' }, 401);
  // Step 2: the people whose email is due.
  const claim = await callDatabase(
    'waitlist_alert_worker_claim',
    { worker_key: workerKey, batch_size: 50 },
    options,
  );
  if (claim === null || !claim.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  const claimedAlerts = (await claim.json()) as ClaimedWaitlistAlert[];
  // Step 3: send, then mark only what left.
  const sentIds = await sendEach(claimedAlerts, new URL(request.url).origin, options);
  if (sentIds.length > 0) {
    const marked = await callDatabase(
      'waitlist_alert_worker_mark_sent',
      { worker_key: workerKey, entry_ids: sentIds },
      options,
    );
    if (marked === null || !marked.ok) return jsonAnswer({ error: 'unavailable' }, 503);
  }
  return jsonAnswer({ sent: sentIds.length, failed: claimedAlerts.length - sentIds.length }, 200);
}
