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
 * Private message emails (IDEAS-2 idea 6) come the same way, with delivery 'message': one line
 * naming who wrote and a link to the chat, never the words, held by the database until the
 * recipient's quiet hours end.
 * Never logged: addresses, keys or the words of an email (CLAUDE.md rule 12).
 * Who calls it: functions/api/notification-emails.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally (where the e2e tests call it themselves, because local pg_cron never calls out).
 */
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';

import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { textOf } from './send-email';
import { ACCOUNT_CLOSING_PATH } from '../src/lib/account-closing-path';
import { writtenLanguageFor } from '../src/schemas/interfaceLanguages';

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
    | 'moderation_decision'
    | 'login_method_added'
    | 'login_method_removed'
    | 'class_archived'
    | 'data_request_confirm'
    | 'data_request_extended'
    | 'data_request_copy_ready'
    | 'picture_opened_by_staff'
    | 'waitlist_admitted'
    | 'account_unused_nudge'
    | 'account_unused_month'
    | 'account_unused_closed'
    | 'new_message';
  actors: { handle: string; display_name: string }[];
  actor_count: number;
  story: { slug: string; title: string } | null;
  chapter: { code: string; title: string | null; position: number } | null;
  comment_excerpt: string | null;
  /** The space a notice is about (an archived class, S1-E8-12), when the reader may see it. */
  space?: { slug: string; name: string } | null;
  /** The data request a notice is about (S1-E11-09): reference, deadline (yyyy-mm-dd), reason. */
  data_request?: { reference: string; deadline: string; extension_reason: string | null } | null;
  /** For a private message email (IDEAS-2 idea 6): whether the chat is still a request. */
  is_request?: boolean;
}

/** One claimed email, as email_worker_claim() answers it. */
export interface ClaimedEmail {
  outbox_id: string;
  to: string;
  language: string;
  /** 'message' is a private message email (IDEAS-2 idea 6): it names the sender, never the words. */
  delivery: 'instant' | 'daily' | 'required' | 'message';
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
  login_method_added: 'loginMethodAdded',
  login_method_removed: 'loginMethodRemoved',
  class_archived: 'classArchived',
  data_request_confirm: 'dataRequestConfirm',
  data_request_extended: 'dataRequestExtended',
  data_request_copy_ready: 'dataRequestCopyReady',
  picture_opened_by_staff: 'pictureOpenedByStaff',
  waitlist_admitted: 'waitlistAdmitted',
  account_unused_nudge: 'accountUnusedNudge',
  account_unused_month: 'accountUnusedMonth',
  account_unused_closed: 'accountUnusedClosed',
  new_message: 'newMessage',
};

/**
 * The kinds that are about the person's own account, never about other people, so their line has
 * no "who" and no plural form: decisions (S1-E10-04), ways to log in (S1-E2-09), an archived
 * class (S1-E8-12), data requests (S1-E11-09), "You're in" (WAITLIST-1) and the emails to an
 * account nobody uses: the nudges, the closing notice and the closing email (INACTIVE-2).
 */
const accountKinds = new Set<EmailNotificationItem['kind']>([
  'moderation_decision',
  'login_method_added',
  'login_method_removed',
  'class_archived',
  'data_request_confirm',
  'data_request_extended',
  'data_request_copy_ready',
  'waitlist_admitted',
  'account_unused_nudge',
  'account_unused_month',
  'account_unused_closed',
]);

/** The subject of each kind that is always sent (delivery 'required'), by its email.json key. */
const requiredSubjectKeys: Partial<Record<EmailNotificationItem['kind'], string>> = {
  moderation_decision: 'subjectDecision',
  login_method_added: 'subjectLoginMethod',
  login_method_removed: 'subjectLoginMethod',
  class_archived: 'subjectClassArchived',
  data_request_confirm: 'subjectDataRequestConfirm',
  data_request_extended: 'subjectDataRequestExtended',
  data_request_copy_ready: 'subjectDataRequestCopyReady',
  picture_opened_by_staff: 'subjectPictureOpenedByStaff',
  waitlist_admitted: 'subjectWaitlistAdmitted',
  account_unused_nudge: 'subjectAccountUnusedNudge',
  account_unused_month: 'subjectAccountUnusedMonth',
  account_unused_closed: 'subjectAccountUnusedClosed',
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
 * Where a notification happened: the story, or "chapter 3 of the story".
 *
 * @param item - the notification
 * @param read - the text reader
 * @returns the words
 */
function whereOf(item: EmailNotificationItem, read: ReadText): string {
  if (item.chapter === null) return item.story?.title ?? '';
  return read('notificationEmails.where', {
    position: item.chapter.position,
    story: item.story?.title ?? '',
  });
}

/**
 * A calendar date ("2027-02-28") in words, in the email's language: "28 February 2027" or
 * "28 februarie 2027". Empty when there is none.
 *
 * @param calendarDate - the date as yyyy-mm-dd, or undefined
 * @param language - the email's language
 * @returns the date in words
 */
function dateInWords(calendarDate: string | undefined, language: string): string {
  if (calendarDate === undefined) return '';
  // Noon UTC is the same calendar day in Bucharest in every season.
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro', {
    timeZone: 'Europe/Bucharest',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${calendarDate}T12:00:00Z`));
}

/**
 * The placeholders a data request's notice fills: the request, its deadline and why it moved
 * (S1-E11-09). Empty for every other kind.
 *
 * @param item - the notification
 * @param language - the email's language, for the date
 * @returns the values by placeholder name
 */
function dataRequestValues(item: EmailNotificationItem, language: string) {
  const dataRequest = item.data_request ?? null;
  if (dataRequest === null) return { reference: '', deadline: '', reason: '' };
  return {
    reference: dataRequest.reference,
    deadline: dateInWords(dataRequest.deadline, language),
    reason: dataRequest.extension_reason ?? '',
  };
}

/**
 * One notification as one sentence, with the comment's first words on the next line.
 *
 * @param item - the notification
 * @param read - the text reader
 * @param language - the email's language, for dates ("ro" when not given)
 * @returns the line or lines
 */
export function notificationLine(
  item: EmailNotificationItem,
  read: ReadText,
  language = 'ro',
): string {
  // Several people take the plural verb in Romanian ("au început"), so they have their own line.
  const isMany = !accountKinds.has(item.kind) && item.actor_count > 1;
  // A message request has its own line ("sent you a message request"), whatever the count.
  const lineKey = item.is_request === true ? 'newMessageRequest' : lineKeys[item.kind];
  const plural = isMany && item.is_request !== true ? 'Many' : '';
  const line = read(`notificationEmails.${lineKey}${plural}`, {
    who: whoDidIt(item, read),
    where: whereOf(item, read),
    space: item.space?.name ?? '',
    count: item.actor_count,
    ...dataRequestValues(item, language),
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
  // A message email is chosen under Settings › Messages, not Notifications (IDEAS-2 idea 6).
  const isMessage = claimed.delivery === 'message';
  return [
    read(isMessage ? 'notificationEmails.messageWhy' : 'notificationEmails.why', {
      link: `${siteUrl}/settings#${isMessage ? 'messages' : 'notifications'}`,
    }),
    read('notificationEmails.unsubscribe', {
      link: `${siteUrl}/unsubscribe?key=${claimed.unsubscribe_key}`,
    }),
  ];
}

/**
 * The subject: the line itself for one instant email, otherwise the digest's, or for an email that
 * is always sent, the subject of its kind (a decision, or a change to the ways to log in).
 *
 * @returns the subject
 */
function subjectOf(claimed: ClaimedEmail, lines: string[], read: ReadText): string {
  if (claimed.delivery === 'required') {
    const firstKind = claimed.items[0]?.kind ?? 'moderation_decision';
    const subjectKey = requiredSubjectKeys[firstKind] ?? 'subjectDecision';
    return read(`notificationEmails.${subjectKey}`);
  }
  if (claimed.delivery === 'daily') return read('notificationEmails.subjectDigest');
  return (lines[0] ?? '').split('\n')[0] ?? '';
}

/**
 * The first line: a digest's, a private message's (which says the words stay in the app), or the
 * one for a single notice.
 *
 * @returns the line
 */
function introOf(claimed: ClaimedEmail, read: ReadText): string {
  if (claimed.delivery === 'daily') return read('notificationEmails.digestIntro');
  if (claimed.delivery === 'message') return read('notificationEmails.messageIntro');
  return read('notificationEmails.instantIntro');
}

/**
 * The link in an email to an account nobody uses (INACTIVE-2): the log-in page for a nudge and
 * the closing notice, because logging in is all it takes to keep the account; for a closed
 * account, the log-in page followed by the page where the data can be downloaded without keeping
 * the account (Robert, 11 Nov 2026, 19:42 and 19:43 UTC).
 *
 * @param kind - the email's first notification kind
 * @returns the line, or null for every other kind
 */
function unusedAccountLinkOf(
  kind: EmailNotificationItem['kind'] | undefined,
  siteUrl: string,
  read: ReadText,
): string | null {
  if (kind === 'account_unused_nudge' || kind === 'account_unused_month') {
    return read('notificationEmails.accountUnusedSignIn', { link: `${siteUrl}/sign-in` });
  }
  if (kind === 'account_unused_closed') {
    return read('notificationEmails.accountUnusedDownload', {
      link: `${siteUrl}/sign-in?next=${encodeURIComponent(ACCOUNT_CLOSING_PATH)}`,
    });
  }
  return null;
}

/**
 * The link back: the chat itself for a private message (by the sender's username), the log-in page
 * for "You're in" and the emails to an unused account (the download page once it is closed), otherwise the
 * Notifications page.
 *
 * @returns the line
 */
function seeAllOf(claimed: ClaimedEmail, siteUrl: string, read: ReadText): string {
  // "You're in" (WAITLIST-1): a link to log in, never a code (Robert, 6 Nov 2026, 17:27 UTC).
  if (claimed.items[0]?.kind === 'waitlist_admitted') {
    return read('notificationEmails.waitlistSignIn', { link: `${siteUrl}/sign-in` });
  }
  // An account nobody uses (INACTIVE-2) gets a link of its own.
  const unusedAccountLink = unusedAccountLinkOf(claimed.items[0]?.kind, siteUrl, read);
  if (unusedAccountLink !== null) return unusedAccountLink;
  const sender = claimed.items[0]?.actors[0]?.handle;
  if (claimed.delivery === 'message' && sender !== undefined) {
    return read('notificationEmails.messageOpen', {
      link: `${siteUrl}/messages/${encodeURIComponent(sender)}`,
    });
  }
  return read('notificationEmails.seeAll', { link: `${siteUrl}/notifications` });
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
  const lines = claimed.items.map((item) => notificationLine(item, read, claimed.language));
  const text = [
    introOf(claimed, read),
    '',
    lines.join('\n\n'),
    '',
    seeAllOf(claimed, siteUrl, read),
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
    const locale = writtenLanguageFor(language);
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
