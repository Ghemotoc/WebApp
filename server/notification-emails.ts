/**
 * The notification emails: one email at once, a daily digest, or none, as each person chose in
 * Settings › Notifications (story S1-E7-02; board Settings 6.3).
 *
 * Why it runs like this: Cloudflare Pages has no scheduler, so the database wakes us. pg_cron runs
 * run_email_worker() every 5 minutes; when emails are due it calls POST /api/notification-emails
 * through pg_net with the worker key (EMAIL_WORKER_KEY here, email_worker_key in the Vault). No
 * service key is used: the database checks the same key in email_worker_claim().
 *
 * What it does, in order:
 * 1. refuses any call without the worker key;
 * 2. claims the due emails (email_worker_claim()), which already leaves out anything the person
 *    wouldn't see on their Notifications page (blocks, ratings, moderation);
 * 3. writes each in the person's language, with the admins' wording laid over email.json
 *    ("email:notificationEmails.*" overrides, S1-E11-19), and adds the one-click unsubscribe
 *    headers (RFC 8058) to every optional email; account, safety and legal emails have none;
 * 4. marks what left (email_worker_mark_sent()); a failed one is tried again later.
 * Never logged: addresses, keys or the words of an email (CLAUDE.md rule 12).
 * Who calls it: functions/api/notification-emails.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally (where the e2e tests call it themselves, because local pg_cron never calls out).
 */
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { textOf } from './send-email';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The bundled default texts. */
const defaultTexts: Record<'ro' | 'en', EmailTexts> = { ro: romanianEmail, en: englishEmail };

/** One notification in a claimed email, as notification_json() draws it (only the parts used). */
export interface EmailNotificationItem {
  kind:
    | 'new_chapter'
    | 'comment_on_chapter'
    | 'comment_reply'
    | 'comment_reactions'
    | 'new_follower'
    | 'moderation_decision';
  actors: { handle: string; display_name: string }[];
  actor_count: number;
  story: { slug: string; title: string } | null;
  chapter: { code: string; title: string | null; position: number } | null;
  comment_excerpt: string | null;
}

/** One claimed email, as email_worker_claim() answers it. */
export interface ClaimedEmail {
  outbox_id: string;
  to: string;
  language: string;
  delivery: 'instant' | 'daily' | 'required';
  unsubscribe_key: string | null;
  items: EmailNotificationItem[];
}

/** What the handler needs from its surroundings. */
export interface NotificationEmailOptions {
  supabaseUrl: string;
  anonKey: string;
  /** EMAIL_WORKER_KEY; without it nothing is sent (503). */
  workerKey: string | undefined;
  sender: EmailSender;
  productName: string;
  companyName: string;
  sendEmail: SendEmail;
  /** The live "email:" overrides of a locale; failures fall back to the file text. */
  readOverrides: (locale: string) => Promise<Map<string, string>>;
}

/** Reads one text by its path ("notificationEmails.newFollower") and fills its placeholders. */
type ReadText = (path: string, values?: Record<string, string | number>) => string;

/** The text group of each kind's line in email.json. */
const lineKeys: Record<EmailNotificationItem['kind'], string> = {
  new_chapter: 'newChapter',
  comment_on_chapter: 'commentOnChapter',
  comment_reply: 'commentReply',
  comment_reactions: 'commentReactions',
  new_follower: 'newFollower',
  moderation_decision: 'moderationDecision',
};

/**
 * Fills {{name}} placeholders with values; product and company names are filled by textOf().
 *
 * @param text - the text with placeholders
 * @param values - the values by name
 * @returns the filled text
 */
export function fillPlaceholders(text: string, values: Record<string, string | number>): string {
  let filled = text;
  for (const [name, value] of Object.entries(values)) {
    filled = filled.split(`{{${name}}}`).join(String(value));
  }
  return filled;
}

/**
 * The people part of a line: "corbu", "corbu and ilinca.r", "corbu, ilinca.r and 10 others".
 *
 * @param item - the notification
 * @param read - the text reader
 * @returns the words
 */
function whoDidIt(item: EmailNotificationItem, read: ReadText): string {
  const [first, second] = item.actors.map((actor) => actor.display_name);
  if (first === undefined) return read('notificationEmails.whoSomeone');
  if (second === undefined) return first;
  const others = item.actor_count - 2;
  if (others <= 0) return read('notificationEmails.whoTwo', { first, second });
  if (others === 1) return read('notificationEmails.whoManyOne', { first, second });
  return read('notificationEmails.whoMany', { first, second, count: others });
}

/**
 * One notification as one sentence, with the comment's first words on the next line.
 *
 * @param item - the notification
 * @param read - the text reader
 * @returns the line or lines
 */
export function notificationLine(item: EmailNotificationItem, read: ReadText): string {
  const where =
    item.chapter === null
      ? (item.story?.title ?? '')
      : read('notificationEmails.where', {
          position: item.chapter.position,
          story: item.story?.title ?? '',
        });
  // Several people take the plural verb in Romanian ("au început"), so they have their own line.
  const isMany = item.kind !== 'moderation_decision' && item.actor_count > 1;
  const line = read(`notificationEmails.${lineKeys[item.kind]}${isMany ? 'Many' : ''}`, {
    who: whoDidIt(item, read),
    where,
  });
  if (item.comment_excerpt === null || item.comment_excerpt === '') return line;
  return `${line}\n“${item.comment_excerpt}”`;
}

/**
 * The closing lines: why the email came and how to stop it, or that it is always sent.
 *
 * @param claimed - the email
 * @param siteUrl - the site's address
 * @param read - the text reader
 * @returns the lines
 */
function footerLines(claimed: ClaimedEmail, siteUrl: string, read: ReadText): string[] {
  if (claimed.delivery === 'required' || claimed.unsubscribe_key === null) {
    return [read('notificationEmails.required')];
  }
  return [
    read('notificationEmails.why', { link: `${siteUrl}/settings#notifications` }),
    read('notificationEmails.unsubscribe', {
      link: `${siteUrl}/unsubscribe?key=${claimed.unsubscribe_key}`,
    }),
  ];
}

/**
 * The subject: the line itself for one instant email, otherwise the digest's or the decision's.
 *
 * @returns the subject
 */
function subjectOf(claimed: ClaimedEmail, lines: string[], read: ReadText): string {
  if (claimed.delivery === 'required') return read('notificationEmails.subjectDecision');
  if (claimed.delivery === 'daily') return read('notificationEmails.subjectDigest');
  return (lines[0] ?? '').split('\n')[0] ?? '';
}

/**
 * Writes one claimed email as plain text, with the one-click unsubscribe headers when it has a key.
 *
 * @param claimed - the email from email_worker_claim()
 * @param siteUrl - the site's address, for the links
 * @param read - the text reader in the person's language
 * @returns the email to send
 */
export function composeNotificationEmail(
  claimed: ClaimedEmail,
  siteUrl: string,
  read: ReadText,
): OutgoingEmail {
  const lines = claimed.items.map((item) => notificationLine(item, read));
  const intro =
    claimed.delivery === 'daily'
      ? read('notificationEmails.digestIntro')
      : read('notificationEmails.instantIntro');
  const text = [
    intro,
    '',
    lines.join('\n\n'),
    '',
    read('notificationEmails.seeAll', { link: `${siteUrl}/notifications` }),
    '',
    read('signOff'),
    read('madeBy'),
    '',
    '—',
    ...footerLines(claimed, siteUrl, read),
  ].join('\n');
  const email: OutgoingEmail = { to: claimed.to, subject: subjectOf(claimed, lines, read), text };
  if (claimed.unsubscribe_key !== null && claimed.delivery !== 'required') {
    // RFC 8058: mail apps show an "Unsubscribe" button that posts to this address.
    email.headers = {
      'List-Unsubscribe': `<${siteUrl}/api/unsubscribe?key=${claimed.unsubscribe_key}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }
  return email;
}

/**
 * Calls one of the worker's database functions with the public key; the worker key is checked
 * inside the function.
 *
 * @returns the response, or null when the database couldn't be reached
 */
async function callDatabase(
  name: string,
  body: Record<string, unknown>,
  options: NotificationEmailOptions,
): Promise<Response | null> {
  return fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${options.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
}

/**
 * A text reader for one language, with the admins' overrides read once per language.
 *
 * @param options - where overrides come from, and the names
 * @returns a function that gives the reader for a language
 */
function readersByLanguage(options: NotificationEmailOptions) {
  const readers = new Map<'ro' | 'en', Promise<ReadText>>();
  return (language: string): Promise<ReadText> => {
    const locale = language === 'en' ? 'en' : 'ro';
    const known = readers.get(locale);
    if (known !== undefined) return known;
    const reader = options
      .readOverrides(locale)
      .catch(() => new Map<string, string>())
      .then(
        (overrides): ReadText =>
          (path, values = {}) =>
            fillPlaceholders(textOf(defaultTexts[locale], overrides, path, options), values),
      );
    readers.set(locale, reader);
    return reader;
  };
}

/**
 * Sends each email, carrying on past a failure.
 *
 * @param claimedEmails - what is due
 * @param siteUrl - the site's address
 * @param options - the sender and how to send
 * @returns the outbox IDs of the emails that left
 */
async function sendEach(
  claimedEmails: ClaimedEmail[],
  siteUrl: string,
  options: NotificationEmailOptions,
): Promise<string[]> {
  const readerFor = readersByLanguage(options);
  const sentIds: string[] = [];
  for (const claimed of claimedEmails) {
    try {
      const read = await readerFor(claimed.language);
      await options.sendEmail(composeNotificationEmail(claimed, siteUrl, read), options.sender);
      sentIds.push(claimed.outbox_id);
    } catch {
      // It stays due and is tried again once its claim runs out (at most 5 times).
    }
  }
  return sentIds;
}

/**
 * Answers POST /api/notification-emails.
 *
 * @param request - the call from run_email_worker(), with "Authorization: Bearer <worker key>"
 * @param options - the database, the key, the sender and how to send
 * @returns 200 with { sent, failed }; 401 for a wrong key; 503 when the key isn't set or the
 *   database can't be reached
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleNotificationEmails(
  request: Request,
  options: NotificationEmailOptions,
): Promise<Response> {
  const json = (body: unknown, status: number) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  // Step 1: only the database's own call, with the worker key.
  const workerKey = options.workerKey ?? '';
  if (workerKey === '') return json({ error: 'not_set_up' }, 503);
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (given !== workerKey) return json({ error: 'not_allowed' }, 401);
  // Step 2: the due emails.
  const claimResponse = await callDatabase(
    'email_worker_claim',
    { worker_key: workerKey, batch_size: 50 },
    options,
  );
  if (claimResponse === null || !claimResponse.ok) return json({ error: 'unavailable' }, 503);
  const claimedEmails = (await claimResponse.json()) as ClaimedEmail[];
  // Step 3: send, then mark only what left.
  const sentIds = await sendEach(claimedEmails, new URL(request.url).origin, options);
  if (sentIds.length > 0) {
    const marked = await callDatabase(
      'email_worker_mark_sent',
      { worker_key: workerKey, outbox_ids: sentIds },
      options,
    );
    if (marked === null || !marked.ok) return json({ error: 'unavailable' }, 503);
  }
  return json({ sent: sentIds.length, failed: claimedEmails.length - sentIds.length }, 200);
}

/**
 * Answers POST /api/unsubscribe?key=…, the one-click unsubscribe a mail app sends from the
 * List-Unsubscribe header (RFC 8058). The /unsubscribe page does the same with a button.
 *
 * @param request - the mail app's POST
 * @param options - the database
 * @returns 200 { unsubscribed: true }; 404 for an unknown key; 503 when the database can't be
 *   reached; 405 for anything but POST
 */
export async function handleUnsubscribe(
  request: Request,
  options: Pick<NotificationEmailOptions, 'supabaseUrl' | 'anonKey'>,
): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'post_only' }, { status: 405 });
  const key = new URL(request.url).searchParams.get('key') ?? '';
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/unsubscribe_from_emails`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${options.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ unsubscribe_key: key }),
  }).catch(() => null);
  if (response === null || !response.ok) {
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
  const found = (await response.json()) as boolean;
  return found
    ? Response.json({ unsubscribed: true })
    : Response.json({ error: 'unknown_key' }, { status: 404 });
}
