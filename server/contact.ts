/**
 * The Contact us form's server side: turns a message into two emails, one to the support inbox
 * and one acknowledgement to the sender, with a reference (story S1-E14-04; decided 23 Oct 2026,
 * Q10; DSA art. 12: a user-friendly contact point, not solely automated). Since S1-E11-13
 * (bundle ADMIN-2h1) the message is also saved as a support ticket, and the reference is the
 * ticket's number (#1042), when SUPPORT_TICKET_SECRET is set; without it, or if the database
 * can't be reached, the old reference (C-<year>-<4 digits>, never stored) keeps the form working.
 *
 * What it does: checks the message against the shared schema (src/schemas/contact.ts), drops a
 * bot that filled the hidden "website" field (Q10d), makes a reference (C-<year>-<4 digits>,
 * never stored: it is only in the two emails, Q10c), and hands both emails to the sender it is
 * given: Brevo's HTTP API on Cloudflare (functions/api/contact.ts, key BREVO_API_KEY set by hand,
 * Q10b) or Mailpit locally (server/pages-functions-plugin.ts).
 * Never stored, never logged: the message, the email, the IP address (CLAUDE.md rule 12). A
 * signed-in person's username and user ID travel in the staff email only (the story's third
 * criterion), so staff can find the account; never the year of birth or the age check.
 * Who calls it: functions/api/contact.ts on Cloudflare, the Vite plugin locally.
 */
import { contactRequestSchema, type ContactRequest } from '../src/schemas/contact';

import { hmacHex } from './signup-context';

/** One email to send. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  /** The address a reply goes to, when it isn't the sender. */
  replyTo?: string;
  /** Extra headers, such as List-Unsubscribe on notification emails (S1-E7-02; RFC 8058). */
  headers?: Record<string, string>;
}

/** How emails leave: Brevo on Cloudflare, Mailpit locally. */
export type SendEmail = (email: OutgoingEmail, from: EmailSender) => Promise<void>;

/** Who the emails come from. */
export interface EmailSender {
  name: string;
  email: string;
}

/** What the handler needs from its surroundings. */
export interface ContactOptions {
  /** The support inbox, from the brand settings (CLAUDE.md: addresses are settings). */
  supportEmail: string;
  productName: string;
  sendEmail: SendEmail;
  /**
   * Where support tickets are saved (S1-E11-13): the database, as the front end reads it, and the
   * secret that signs each message (SUPPORT_TICKET_SECRET; the same value is in Supabase Vault as
   * support_ticket_secret). Left out, or with an empty secret, no ticket is saved.
   */
  tickets?: { supabaseUrl: string; anonKey: string; secret: string | undefined };
  /** Picks the 4-digit part of the reference; passed in so tests are exact. */
  randomDigits?: () => string;
  now?: Date;
}

/** The subject line's words for each topic, in English for staff (code tour: staff read English). */
const topicWords: Record<ContactRequest['topic'], string> = {
  question: 'Question',
  account: 'Account problem',
  data_request: 'Data request',
  other: 'Other',
};

/** The acknowledgement in the sender's language ("we reply within one month", Q10f). */
const acknowledgements = {
  en: {
    subject: (reference: string, product: string) =>
      `We've received your message (${reference}) · ${product}`,
    body: (reference: string, product: string) =>
      `Thank you for writing to us.\n\nYour reference is ${reference}. Keep it in case you write again about the same thing.\n\nA person on our team reads every message. We reply within one month, usually much sooner.\n\nThe ${product} team`,
  },
  ro: {
    subject: (reference: string, product: string) =>
      `Am primit mesajul tău (${reference}) · ${product}`,
    body: (reference: string, product: string) =>
      `Îți mulțumim că ne-ai scris.\n\nReferința ta este ${reference}. Păstreaz-o în caz că ne scrii din nou despre același lucru.\n\nO persoană din echipa noastră citește fiecare mesaj. Răspundem în cel mult o lună, de obicei mult mai repede.\n\nEchipa ${product}`,
  },
};

/**
 * Four random digits, from the platform's random numbers.
 *
 * @returns for example "0482"
 */
function fourRandomDigits(): string {
  const number = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(number % 10_000).padStart(4, '0');
}

/**
 * The reference the person quotes: C-<year>-<4 digits>. It is made here and not stored (Q10c):
 * the two emails carry it, and staff search their inbox by it.
 *
 * @param now - the current time
 * @param randomDigits - the 4-digit part
 * @returns for example "C-2026-0482"
 */
export function makeContactReference(now: Date, randomDigits: () => string): string {
  return `C-${String(now.getUTCFullYear())}-${randomDigits()}`;
}

/**
 * Saves the message as a support ticket through submit_contact_ticket(), signed so the database
 * knows it came through this server (S1-E11-13 criterion 1).
 *
 * @param message - the checked message
 * @param tickets - the database and the secret
 * @param now - the current time, sent so the database can refuse an old copy
 * @returns the ticket's reference ("#1042"), or null when it couldn't be saved
 * Errors: none thrown; a failure falls back to the old reference so the person is still answered.
 */
export async function saveContactTicket(
  message: ContactRequest,
  tickets: NonNullable<ContactOptions['tickets']>,
  now: Date,
): Promise<string | null> {
  // Step 1: without the secret nothing can be saved.
  if (tickets.secret === undefined || tickets.secret === '' || tickets.supabaseUrl === '')
    return null;
  // Step 2: the fields the database reads, signed exactly as sent.
  const payload = JSON.stringify({
    topic: message.topic,
    message: message.message,
    email: message.email,
    language: message.language,
    sentAt: now.toISOString(),
  });
  try {
    const response = await fetch(`${tickets.supabaseUrl}/rest/v1/rpc/submit_contact_ticket`, {
      method: 'POST',
      headers: {
        apikey: tickets.anonKey,
        Authorization: `Bearer ${tickets.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload, signature: await hmacHex(payload, tickets.secret) }),
    });
    if (!response.ok) return null;
    // Step 3: the number the person quotes.
    const ticketNumber = (await response.json()) as unknown;
    return typeof ticketNumber === 'number' ? `#${String(ticketNumber)}` : null;
  } catch {
    return null;
  }
}

/**
 * The email staff receive: the topic in the subject, the message, and who wrote (username and
 * user ID for a signed-in person; never the year of birth or the age check).
 *
 * @param message - the checked message
 * @param reference - its reference
 * @param supportEmail - the inbox
 * @returns the email
 */
export function staffEmail(
  message: ContactRequest,
  reference: string,
  supportEmail: string,
): OutgoingEmail {
  const who =
    message.handle === undefined
      ? `From: ${message.email} (not signed in)`
      : `From: @${message.handle} (user ID ${message.userId ?? 'unknown'}), ${message.email}`;
  return {
    to: supportEmail,
    replyTo: message.email,
    subject: `[${reference}] ${topicWords[message.topic]}`,
    text: `${who}\nLanguage: ${message.language}\nTopic: ${topicWords[message.topic]}\n\n${message.message}\n`,
  };
}

/**
 * Answers POST /api/contact.
 *
 * @param request - the request with the form's JSON
 * @param options - the inbox, the product name, how to send, and (for tests) the clock and digits
 * @returns 200 with { reference } (the ticket number when saved); 400 for a message that fails the
 *   schema; 200 with a made-up
 *   reference for a bot that filled the honeypot (it learns nothing); 502 when sending fails
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleContact(request: Request, options: ContactOptions): Promise<Response> {
  const now = options.now ?? new Date();
  const randomDigits = options.randomDigits ?? fourRandomDigits;
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  // Step 1: the message must match the shared schema.
  const parsed = contactRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid' }, 400);
  const message = parsed.data;
  // Step 2: a bot that filled the hidden field gets a reference and nothing is saved or sent (Q10d).
  if (message.website !== undefined && message.website !== '')
    return json({ reference: makeContactReference(now, randomDigits) }, 200);
  // Step 3: the support ticket, whose number is the reference (S1-E11-13), or the old reference.
  const ticketReference =
    options.tickets === undefined ? null : await saveContactTicket(message, options.tickets, now);
  const reference = ticketReference ?? makeContactReference(now, randomDigits);
  // Step 4: the two emails, from the product's own address.
  const from: EmailSender = { name: `${options.productName} team`, email: options.supportEmail };
  const acknowledgement = acknowledgements[message.language];
  try {
    await options.sendEmail(staffEmail(message, reference, options.supportEmail), from);
    await options.sendEmail(
      {
        to: message.email,
        subject: acknowledgement.subject(reference, options.productName),
        text: acknowledgement.body(reference, options.productName),
      },
      from,
    );
  } catch {
    return json({ error: 'unsent' }, 502);
  }
  return json({ reference }, 200);
}

/**
 * Sends through Brevo's transactional email API (EU company; the key is BREVO_API_KEY, set by
 * hand on Cloudflare, Q10b). No script or cookie reaches our pages: the call is server to server.
 *
 * @param apiKey - the Brevo API key
 * @returns a SendEmail for handleContact()
 * Errors: throws when Brevo answers anything but success, so the form shows "unsent".
 */
export function sendWithBrevo(apiKey: string): SendEmail {
  return async (email, from) => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: email.to }],
        replyTo: email.replyTo === undefined ? undefined : { email: email.replyTo },
        headers: email.headers,
        subject: email.subject,
        textContent: email.text,
      }),
    });
    if (!response.ok) throw new Error(`Brevo answered ${String(response.status)}`);
  };
}

/**
 * Sends into Mailpit, the local Supabase's mail catcher, so local development and the end-to-end
 * tests can read the emails (never on Cloudflare).
 *
 * @param mailpitUrl - Mailpit's API, for example http://127.0.0.1:54324/api/v1
 * @returns a SendEmail for handleContact()
 * Errors: throws when Mailpit isn't running.
 */
export function sendWithMailpit(mailpitUrl: string): SendEmail {
  return async (email, from) => {
    const response = await fetch(`${mailpitUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Name: from.name, Email: from.email },
        To: [{ Email: email.to }],
        ReplyTo: email.replyTo === undefined ? undefined : [{ Email: email.replyTo }],
        Headers: email.headers,
        Subject: email.subject,
        Text: email.text,
      }),
    });
    if (!response.ok) throw new Error(`Mailpit answered ${String(response.status)}`);
  };
}
