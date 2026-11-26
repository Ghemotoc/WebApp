/**
 * The Supabase Auth Send Email hook: every Auth email (sign-up, log-in link, reset, change email,
 * password changed) goes out with the admins' wording (story S1-E11-19; architecture B09 and B34).
 *
 * How it works: Supabase Auth calls POST /api/send-email instead of sending its own template. This
 * handler checks the call is really from our Supabase project (the Standard Webhooks signature,
 * keyed with SEND_EMAIL_HOOK_SECRET), picks the email for the action and the person's language,
 * lays the published admin overrides (published_interface_text(), "email:" keys) over
 * src/locales/<lang>/email.json, fills the locked placeholders (the link or the code Supabase made;
 * we never make or store a code) and sends it through the SendEmail it is given: Brevo on
 * Cloudflare, Mailpit locally. Each email has a plain-text part and the branded HTML part of
 * boards E01 and E02 (server/email-layout.ts), both in the person's language; Auth emails are about
 * the account, so they never carry an unsubscribe link.
 * Links point at our own site (options.siteUrl), never at email_data.site_url: Supabase fills that
 * with its own Auth address, where /reset-password answers "No API key found" (ADMIN thread,
 * 26 Nov 2026, before the 27 Nov trial). Our pages /auth/confirm and /reset-password hand the
 * token hash to Auth with verifyOtp().
 * Errors: a bad signature is 401; an unknown email type 400; a failed send 500, so Auth tells the
 * person the email couldn't be sent and offers to try again. Never logged: the address, the code,
 * the link or the text (CLAUDE.md rule 12).
 * Who calls it: functions/api/send-email.ts on Cloudflare. Switched on by hand in the Supabase
 * dashboard (Authentication › Hooks); until then Auth uses supabase/templates/ (GO-LIVE list).
 */
import englishEmail from '../src/locales/en/email.json';
import romanianEmail from '../src/locales/ro/email.json';

import type { EmailSender, SendEmail } from './contact';
import { emailLogoUrl, renderEmailHtml, type EmailBrand, type EmailContent } from './email-layout';
import { sameText } from './same-text';
import { writtenLanguageFor } from '../src/schemas/interfaceLanguages';

/** The texts of one language, as in email.json. */
type EmailTexts = Record<string, string | Record<string, string>>;

/** The bundled default texts, Romanian first (decided 17 Oct 2026, 11:48). */
const defaultTexts: Record<'ro' | 'en', EmailTexts> = { ro: romanianEmail, en: englishEmail };

/** What Supabase Auth sends the hook (only the parts used). */
export interface SendEmailHookPayload {
  user: {
    email: string;
    new_email?: string;
    /** joins_waitlist: the sign-up joined the waiting list without a code (WAITLIST-1). */
    user_metadata?: { locale?: string; joins_waitlist?: boolean };
  };
  email_data: {
    token: string;
    token_hash: string;
    /** Only for a change of email: the code for the NEW address (Supabase's names are reversed). */
    token_new?: string;
    email_action_type: string;
    site_url: string;
  };
}

/** One kind of Auth email: its text group, and its link or code. */
interface AuthEmailKind {
  group: string;
  /** The address the button opens, from the site and the token hash; none when it shows a code. */
  linkFor?: (siteUrl: string, tokenHash: string) => string;
  /** False for a notice of something done: there is nothing to ignore. */
  includesIgnoreLine?: boolean;
}

/** The emails by Supabase's action type (the same as scripts/build-auth-email-templates.ts). */
const authEmailKinds: Record<string, AuthEmailKind> = {
  signup: {
    group: 'confirmation',
    linkFor: (site, hash) => `${site}/auth/confirm?token_hash=${hash}&type=email`,
  },
  magiclink: {
    group: 'magicLink',
    linkFor: (site, hash) => `${site}/auth/confirm?token_hash=${hash}&type=email`,
  },
  recovery: {
    group: 'recovery',
    linkFor: (site, hash) => `${site}/reset-password?token_hash=${hash}&type=recovery`,
  },
  email_change: { group: 'emailChange' },
  // A code to confirm it's really them before a sensitive change (only with secure_password_change).
  reauthentication: { group: 'reauthentication' },
  password_changed_notification: {
    group: 'passwordChanged',
    linkFor: (site) => `${site}/forgot-password`,
    includesIgnoreLine: false,
  },
};

/** What the handler needs from its surroundings. */
export interface SendEmailHookOptions {
  /** "v1,whsec_<base64>", from the Supabase dashboard. */
  hookSecret: string;
  /** Our own website (from VITE_BRAND_SITE_DOMAIN), which every link in the email opens. */
  siteUrl: string;
  sender: EmailSender;
  productName: string;
  companyName: string;
  /** The company's own site, which the company name in the footer links to (brand config). */
  companySiteUrl: string;
  /** The support address in "Questions? Write to …" (brand config). */
  supportEmail: string;
  sendEmail: SendEmail;
  /** The live "email:" overrides of a locale; failures fall back to the file text. */
  readOverrides: (locale: string) => Promise<Map<string, string>>;
  now?: () => number;
}

/** The names textOf() fills in: {{productName}}, {{companyName}} and, when given, {{supportEmail}}. */
export interface EmailNames {
  productName: string;
  companyName: string;
  supportEmail?: string;
}

/**
 * Checks a Standard Webhooks signature (what Supabase Auth hooks use).
 *
 * @param secret - "v1,whsec_<base64>" or "whsec_<base64>"
 * @param headers - the request's headers
 * @param body - the raw body
 * @param nowSeconds - the time now, to refuse old calls (more than 5 minutes)
 * @returns true when one of the signatures matches
 */
export async function verifyHookSignature(
  secret: string,
  headers: Headers,
  body: string,
  nowSeconds: number,
): Promise<boolean> {
  const id = headers.get('webhook-id') ?? '';
  const timestamp = headers.get('webhook-timestamp') ?? '';
  const signatures = (headers.get('webhook-signature') ?? '').split(' ');
  // A missing id, or a time that isn't a whole number of seconds within 5 minutes of now, is
  // refused. Number('abc') is NaN, and NaN > 300 is false, so the check must ask for a number
  // first or a broken timestamp would pass (QA-1d, finding X3).
  const sentAtSeconds = Number(timestamp);
  if (id === '' || timestamp === '' || !Number.isInteger(sentAtSeconds)) return false;
  if (Math.abs(nowSeconds - sentAtSeconds) > 300) return false;
  // Step 1: the key is the base64 part after "whsec_".
  const keyBytes = Uint8Array.from(
    atob(secret.replace(/^v1,/, '').replace(/^whsec_/, '')),
    (char) => char.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  // Step 2: sign "id.timestamp.body" and compare with each "v1,<base64>" given.
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));
  // Compared in constant time, so timing says nothing about how close a forged signature was.
  return signatures.some((signature) => sameText(signature, `v1,${expected}`));
}

/**
 * One text of an email: the admin's override when there is one, else the file text, with the
 * product and company names (and the support address, when given) filled in.
 *
 * @returns the text
 */
export function textOf(
  texts: EmailTexts,
  overrides: Map<string, string>,
  path: string,
  names: EmailNames,
): string {
  const [group, field] = path.includes('.') ? path.split('.') : [path, undefined];
  const fileValue =
    field === undefined
      ? texts[group ?? '']
      : (texts[group ?? ''] as Record<string, string> | undefined)?.[field];
  const value = overrides.get(`email:${path}`) ?? (typeof fileValue === 'string' ? fileValue : '');
  return value
    .split('{{productName}}')
    .join(names.productName)
    .split('{{companyName}}')
    .join(names.companyName)
    .split('{{supportEmail}}')
    .join(names.supportEmail ?? '{{supportEmail}}');
}

/** What composing an Auth email needs besides its words: the brand and the language. */
export interface AuthEmailContext {
  /** Reads one text by its path ("confirmation.body"), in the person's language. */
  read: (path: string) => string;
  brand: EmailBrand;
  language: string;
}

/**
 * What one Auth email says, for the HTML layout (boards E01 and E02).
 *
 * @param kind - which email (its text group, and whether it has the "not you" line)
 * @param action - the link or the code it carries
 * @param read - reads one text by its path
 * @returns the content for renderEmailHtml()
 */
export function authEmailContent(
  kind: Pick<AuthEmailKind, 'group' | 'includesIgnoreLine'>,
  action: { link?: string; code?: string },
  read: (path: string) => string,
): EmailContent {
  const linkNote = read(`${kind.group}.linkNote`);
  const content: EmailContent = {
    heading: read(`${kind.group}.heading`),
    // The link note is the first line an inbox shows (board E01, frame 1).
    preheader: linkNote,
    paragraphs: [read(`${kind.group}.body`)],
    linkNote,
    signOff: read('signOff'),
    madeBy: read('madeBy'),
    questions: read('questions'),
  };
  // The one action: the code Supabase made, or the button with its link.
  if (action.code !== undefined) {
    content.code = { label: read(`${kind.group}.codeLabel`), value: action.code };
  } else {
    const pasteLabel = read('pasteLink');
    content.action = { label: read(`${kind.group}.button`), url: action.link ?? '', pasteLabel };
  }
  if (kind.includesIgnoreLine !== false) content.notYou = read('notYou');
  return content;
}

/**
 * Writes one Auth email: the plain text every mail app can show, and the branded HTML.
 *
 * @param kind - which email
 * @param action - the link or the code it carries
 * @param context - the text reader, the brand and the language
 * @returns the subject, the text and the HTML
 */
export function composeAuthEmail(
  kind: AuthEmailKind,
  action: { link?: string; code?: string },
  context: AuthEmailContext,
): { subject: string; text: string; html: string } {
  const read = context.read;
  const lines = [read(`${kind.group}.heading`), '', read(`${kind.group}.body`), ''];
  // The one action: the code Supabase made, or the button's link.
  if (action.code !== undefined)
    lines.push(`${read(`${kind.group}.codeLabel`)} ${action.code}`, '');
  else lines.push(`${read(`${kind.group}.button`)}: ${action.link ?? ''}`, '');
  lines.push(read(`${kind.group}.linkNote`));
  if (kind.includesIgnoreLine !== false) lines.push('', read('notYou'));
  // The plain text gives the company's address after its name (board E01, frame 4).
  lines.push('', read('signOff'), `${read('madeBy')}: ${context.brand.companySiteUrl}`);
  const html = renderEmailHtml(
    context.language,
    authEmailContent(kind, action, read),
    context.brand,
  );
  return { subject: read(`${kind.group}.subject`), text: lines.join('\n'), html };
}

/** One email to send: where it goes, and the link or the code it carries. */
interface AuthEmailRecipient {
  to: string;
  link?: string;
  code?: string;
}

/**
 * The codes a change of email sends. Supabase's field names are reversed for backward
 * compatibility: `token` is the CURRENT address's code and `token_new` the NEW address's
 * (Supabase docs, Send Email Hook, "email_change"). With double_confirm_changes on
 * (supabase/config.toml) both come and each address gets its own; with it off only one comes and
 * it belongs to the new address.
 *
 * @param payload - Supabase Auth's call
 * @returns one email per address
 */
function emailChangeRecipientsOf(payload: SendEmailHookPayload): AuthEmailRecipient[] {
  const currentCode = payload.email_data.token;
  const newCode = payload.email_data.token_new ?? '';
  const newAddress = payload.user.new_email ?? '';
  // Step 1: both codes, so each address gets the one Auth will check against it.
  if (currentCode !== '' && newCode !== '') {
    const emails: AuthEmailRecipient[] = [{ to: payload.user.email, code: currentCode }];
    if (newAddress !== '') emails.push({ to: newAddress, code: newCode });
    return emails;
  }
  // Step 2: one code only, which proves the new address; without a new address there is no one
  // to send it to, and the current one would hold a code it can't use.
  const onlyCode = newCode === '' ? currentCode : newCode;
  return newAddress === '' ? [] : [{ to: newAddress, code: onlyCode }];
}

/**
 * The emails one hook call sends: one, or two for a change of email (a code to each address).
 *
 * @param payload - Supabase Auth's call
 * @param kind - which email
 * @param siteUrl - our own website, for the links
 * @returns each email's address and its link or code
 */
function recipientsOf(
  payload: SendEmailHookPayload,
  kind: AuthEmailKind,
  siteUrl: string,
): AuthEmailRecipient[] {
  const data = payload.email_data;
  if (kind.linkFor !== undefined)
    return [{ to: payload.user.email, link: kind.linkFor(siteUrl, data.token_hash) }];
  if (data.email_action_type === 'email_change') return emailChangeRecipientsOf(payload);
  return [{ to: payload.user.email, code: data.token }];
}

/**
 * The confirmation email for someone who joined the waiting list (WAITLIST-1): the same link,
 * worded "You're on the list" (Robert, 6 Nov 2026, 17:27 UTC).
 */
const waitlistConfirmation: AuthEmailKind = {
  group: 'waitlistConfirmation',
  linkFor: (site, hash) => `${site}/auth/confirm?token_hash=${hash}&type=email`,
};

/**
 * Which email this call is: by Supabase's action type, and for a sign-up that joined the waiting
 * list, the "You're on the list" wording.
 *
 * @param payload - Supabase Auth's call
 * @returns the kind, or undefined when it isn't set up
 */
export function authEmailKindOf(payload: SendEmailHookPayload): AuthEmailKind | undefined {
  const actionType = payload.email_data.email_action_type;
  if (actionType === 'signup' && payload.user.user_metadata?.joins_waitlist === true) {
    return waitlistConfirmation;
  }
  return authEmailKinds[actionType];
}

/**
 * The brand parts of the HTML layout, from the handler's options.
 *
 * @param options - the names and addresses from the brand config
 * @param siteUrl - our own site, where the PNG logo lives
 * @returns the brand for renderEmailHtml()
 */
export function emailBrandOf(
  options: Pick<
    SendEmailHookOptions,
    'productName' | 'companyName' | 'companySiteUrl' | 'supportEmail'
  >,
  siteUrl: string,
): EmailBrand {
  return {
    productName: options.productName,
    companyName: options.companyName,
    companySiteUrl: options.companySiteUrl,
    supportEmail: options.supportEmail,
    logoUrl: emailLogoUrl(siteUrl),
  };
}

/**
 * Answers one hook call.
 *
 * @param request - Supabase Auth's POST
 * @param options - the secret, the sender and where overrides come from
 * @returns 200 {} when sent; 401, 400 or 500 with a plain message
 */
export async function handleSendEmailHook(
  request: Request,
  options: SendEmailHookOptions,
): Promise<Response> {
  const body = await request.text();
  const nowSeconds = Math.floor((options.now?.() ?? Date.now()) / 1000);
  // Step 1: only our Supabase project may ask.
  if (!(await verifyHookSignature(options.hookSecret, request.headers, body, nowSeconds))) {
    return Response.json(
      { error: { http_code: 401, message: 'The email request was not signed.' } },
      { status: 401 },
    );
  }
  const payload = JSON.parse(body) as SendEmailHookPayload;
  const kind = authEmailKindOf(payload);
  if (kind === undefined) {
    return Response.json(
      { error: { http_code: 400, message: 'This kind of email is not set up.' } },
      { status: 400 },
    );
  }
  // Step 2: the person's language, Romanian unless they chose English, with the admins' wording.
  const locale = writtenLanguageFor(payload.user.user_metadata?.locale);
  const overrides = await options.readOverrides(locale).catch(() => new Map<string, string>());
  const read = (path: string) => textOf(defaultTexts[locale], overrides, path, options);
  // Step 3: send, and tell Auth plainly when it couldn't be sent.
  try {
    const siteUrl = options.siteUrl.replace(/\/+$/, '');
    const context = { read, brand: emailBrandOf(options, siteUrl), language: locale };
    for (const recipient of recipientsOf(payload, kind, siteUrl)) {
      const email = composeAuthEmail(kind, recipient, context);
      await options.sendEmail(
        { to: recipient.to, subject: email.subject, text: email.text, html: email.html },
        options.sender,
      );
    }
  } catch {
    return Response.json(
      { error: { http_code: 500, message: 'The email could not be sent. Please try again.' } },
      { status: 500 },
    );
  }
  return Response.json({});
}

/**
 * Reads the live "email:" overrides of a locale from the database with the public key.
 *
 * @param supabaseUrl - the project's address
 * @param anonKey - the public anon key (never the service key)
 * @returns a reader for handleSendEmailHook
 */
export function overridesFromDatabase(supabaseUrl: string, anonKey: string) {
  return async (locale: string): Promise<Map<string, string>> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/published_interface_text`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wanted_locale: locale }),
    });
    if (!response.ok) throw new Error(`The overrides read answered ${String(response.status)}`);
    const rows = (await response.json()) as { text_key: string; text: string }[];
    return new Map(
      rows
        .filter((row) => row.text_key.startsWith('email:'))
        .map((row) => [row.text_key, row.text]),
    );
  };
}
