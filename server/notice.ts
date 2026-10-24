/**
 * The public report form's server side: checks a notice or an authority order, saves it in the
 * database and sends the acknowledgement email (story S1-E10-02; DSA art. 16(4): confirmation of
 * receipt; Regulation (EU) 2021/784 art. 15: our contact point for removal orders).
 *
 * What it does, in order:
 * 1. checks the request against the shared schema (src/schemas/notice.ts);
 * 2. for a notice, the accessible bot check: a hidden honeypot field and a minimum time to fill,
 *    no puzzle (WCAG 2.2, 3.3.8). A bot gets a made-up answer and nothing is saved. An authority
 *    order never meets this check, so it can never be blocked;
 * 3. signs the checked fields with NOTICE_SECRET and calls submit_public_notice(), which refuses
 *    anything not signed with the same secret (Vault: public_notice_secret);
 * 4. emails the acknowledgement with the reference and the time of receipt to the notifier (when
 *    they gave an email), and for an order also the support inbox, so a person sees it at once
 *    next to the logged on-call alert (the phone alert is S1-E10-09).
 * Never logged: the notice, names, emails or IP addresses (CLAUDE.md rule 12). Rate limiting is a
 * Cloudflare rule on /api/notice, set by hand (docs/runbooks/notice-form.md), so no IP is stored.
 * Who calls it: functions/api/notice.ts on Cloudflare, server/pages-functions-plugin.ts locally.
 */
import {
  minimumFillMilliseconds,
  noticeRequestSchema,
  type ContentNotice,
  type NoticeRequest,
} from '../src/schemas/notice';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { hmacHex } from './signup-context';

/** What the handler needs from its surroundings. */
export interface NoticeOptions {
  supabaseUrl: string;
  anonKey: string;
  /** NOTICE_SECRET; without it nothing can be saved (503). */
  secret: string | undefined;
  supportEmail: string;
  productName: string;
  sendEmail: SendEmail;
  now?: Date;
}

/** What the database answers. */
interface SavedNotice {
  reference: string;
  receivedAt: string;
}

/** The acknowledgement's words, in the notifier's language. */
const acknowledgements = {
  en: {
    subject: (reference: string, product: string) =>
      `We've received your report (${reference}) · ${product}`,
    notice: (reference: string, time: string, product: string) =>
      `Thank you for your report.\n\nYour reference is ${reference}. We received it on ${time} (Romania time).\n\nA person on our moderation team checks every report. We'll write to you again with our decision.\n\nThe ${product} team`,
    order: (reference: string, time: string, product: string) =>
      `We confirm receipt of your removal order.\n\nOur reference: ${reference}\nTime of receipt: ${time} (Romania time)\n\nThe order has been passed to the person on call. We act on removal orders within one hour of receipt, as Regulation (EU) 2021/784 requires, and will confirm what we did.\n\nThe ${product} team`,
  },
  ro: {
    subject: (reference: string, product: string) =>
      `Am primit raportarea ta (${reference}) · ${product}`,
    notice: (reference: string, time: string, product: string) =>
      `Îți mulțumim pentru raportare.\n\nReferința ta este ${reference}. Am primit-o pe ${time} (ora României).\n\nO persoană din echipa noastră de moderare verifică fiecare raportare. Îți vom scrie din nou cu decizia noastră.\n\nEchipa ${product}`,
    order: (reference: string, time: string, product: string) =>
      `Confirmăm primirea ordinului de eliminare.\n\nReferința noastră: ${reference}\nOra primirii: ${time} (ora României)\n\nOrdinul a fost transmis persoanei de serviciu. Acționăm în cel mult o oră de la primire, așa cum cere Regulamentul (UE) 2021/784, și vom confirma ce am făcut.\n\nEchipa ${product}`,
  },
};

/**
 * The time of receipt as people in Romania read it, for the acknowledgement.
 *
 * @param isoTime - the database's time of receipt
 * @param language - the notifier's language
 * @returns for example "24 October 2026, 21:05:12"
 */
export function formatReceiptTime(isoTime: string, language: 'ro' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
    timeZone: 'Europe/Bucharest',
    dateStyle: 'long',
    timeStyle: 'medium',
  }).format(new Date(isoTime));
}

/**
 * Says whether a notice looks like it came from a bot: the hidden field filled, or the form sent
 * faster than a person can.
 *
 * @param notice - the checked notice
 * @param now - the current time
 * @returns true for a bot
 */
export function looksLikeABot(notice: ContentNotice, now: Date): boolean {
  if (notice.website !== undefined && notice.website !== '') return true;
  if (notice.openedAt === undefined) return false;
  return now.getTime() - notice.openedAt < minimumFillMilliseconds;
}

/**
 * The fields the database stores, in the shape submit_public_notice() reads.
 *
 * @param request - the checked request
 * @returns the payload object (the honeypot and the timing are left out)
 */
export function databasePayload(request: NoticeRequest): Record<string, unknown> {
  if (request.kind === 'removal_order') {
    return {
      kind: request.kind,
      contentUrl: request.contentUrl,
      explanation: request.explanation,
      authorityName: request.authorityName,
      orderReference: request.orderReference,
      notifierEmail: request.notifierEmail,
      language: request.language,
    };
  }
  return {
    kind: request.kind,
    reason: request.reason,
    contentUrl: request.contentUrl,
    explanation: request.explanation,
    notifierName: request.notifierName,
    notifierEmail: request.notifierEmail,
    goodFaith: request.goodFaith,
    language: request.language,
  };
}

/**
 * Saves the notice through submit_public_notice(), signed.
 *
 * @param request - the checked request
 * @param options - where the database is and the secret
 * @returns the reference and the time of receipt, or 'invalid' when the database refused the
 *   fields, or 'unavailable' for anything else (no secret, the database down)
 */
async function saveNotice(
  request: NoticeRequest,
  options: NoticeOptions & { secret: string },
): Promise<SavedNotice | 'invalid' | 'unavailable'> {
  const payload = JSON.stringify(databasePayload(request));
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/submit_public_notice`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${options.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payload, signature: await hmacHex(payload, options.secret) }),
  }).catch(() => null);
  if (response === null) return 'unavailable';
  // A check the table refused (a missing field the schema let through): the form says "check".
  if (response.status === 400) return 'invalid';
  if (!response.ok) return 'unavailable';
  const rows = (await response.json()) as { notice_reference: string; received_at: string }[];
  const row = rows[0];
  if (row === undefined) return 'unavailable';
  return { reference: row.notice_reference, receivedAt: row.received_at };
}

/**
 * The emails for a saved notice: the acknowledgement to the notifier, and for an order the
 * support inbox too.
 *
 * @param request - the checked request
 * @param saved - the reference and the time of receipt
 * @param options - the inbox and the product name
 * @returns the emails to send
 */
export function acknowledgementEmails(
  request: NoticeRequest,
  saved: SavedNotice,
  options: Pick<NoticeOptions, 'supportEmail' | 'productName'>,
): OutgoingEmail[] {
  const words = acknowledgements[request.language];
  const time = formatReceiptTime(saved.receivedAt, request.language);
  const isOrder = request.kind === 'removal_order';
  const emails: OutgoingEmail[] = [];
  if (request.notifierEmail !== undefined) {
    emails.push({
      to: request.notifierEmail,
      subject: words.subject(saved.reference, options.productName),
      text: isOrder
        ? words.order(saved.reference, time, options.productName)
        : words.notice(saved.reference, time, options.productName),
    });
  }
  if (isOrder) {
    // Staff read English; the order itself is on the case page, so only the reference travels.
    emails.push({
      to: options.supportEmail,
      subject: `[${saved.reference}] Removal order received: act within one hour`,
      text: `A removal order arrived at ${formatReceiptTime(saved.receivedAt, 'en')} (Romania time).\n\nOpen the moderation queue in the staff area: the case ${saved.reference} is at the top, with its one-hour deadline.\n`,
    });
  }
  return emails;
}

/**
 * Answers POST /api/notice.
 *
 * @param request - the request with the form's JSON
 * @param options - the database, the secret, the inbox, how to send, and (for tests) the clock
 * @returns 200 with { reference, receivedAt, acknowledged }; 400 for a request that fails the
 *   schema or the database's checks; 503 when it can't be saved; a made-up 200 for a bot
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleNotice(request: Request, options: NoticeOptions): Promise<Response> {
  const now = options.now ?? new Date();
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  // Step 1: the shared schema.
  const parsed = noticeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid' }, 400);
  const notice = parsed.data;
  // Step 2: the bot check, for notices only; a bot learns nothing.
  if (notice.kind === 'notice' && looksLikeABot(notice, now)) {
    return json({ reference: 'N-000000', receivedAt: now.toISOString(), acknowledged: true }, 200);
  }
  // Step 3: saved and signed; without the secret nothing can be saved.
  if (options.secret === undefined || options.secret === '')
    return json({ error: 'unavailable' }, 503);
  const saved = await saveNotice(notice, { ...options, secret: options.secret });
  if (saved === 'invalid') return json({ error: 'invalid' }, 400);
  if (saved === 'unavailable') return json({ error: 'unavailable' }, 503);
  // Step 4: the acknowledgement; the notice is saved even if an email fails.
  const acknowledged = await sendAcknowledgements(
    acknowledgementEmails(notice, saved, options),
    options,
  );
  return json({ ...saved, acknowledged }, 200);
}

/**
 * Sends the acknowledgement emails one by one, carrying on past a failure.
 *
 * @param emails - what to send
 * @param options - the inbox, the product name and how to send
 * @returns true when every email left, false when any failed
 */
async function sendAcknowledgements(
  emails: OutgoingEmail[],
  options: NoticeOptions,
): Promise<boolean> {
  const from: EmailSender = { name: `${options.productName} team`, email: options.supportEmail };
  let everyEmailSent = true;
  for (const email of emails) {
    try {
      await options.sendEmail(email, from);
    } catch {
      everyEmailSent = false;
    }
  }
  return everyEmailSent;
}
