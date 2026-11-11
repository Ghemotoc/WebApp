/**
 * A data request's parent path, server side (bundle ADMIN-2, part c3; story S1-E11-09 criterion
 * 5 and "for a parent, a one-time link to the checked email address"; GDPR art. 8 and 12(6)).
 *
 * The addresses, both under /api/data-request-parent/, both with a staff member's own sign-in and
 * the body { requestId }:
 * - POST ask: makes a random token (32 bytes), signs "data-request-ask|<request id>|<hash>" with
 *   PARENTAL_CONSENT_SECRET (the same secret as parental consent, with its own prefix) and calls
 *   admin_ask_data_request_parent(), which checks the staff member, stores only the hash and
 *   answers the address of the parent who agreed (S1-E2-03). Then emails that parent the link
 *   /data-request/parent#<token>: "did you or your child ask for this?";
 * - POST send: after staff sent the copy, signs a second token ("data-request-copy|…") for
 *   admin_send_data_request_parent_copy() and emails the parent the one-time link to the files.
 * The token sits after "#", so it never reaches a server log or a Referer header. Staff never see
 * it and can't store one of their own: the database refuses a hash our server didn't sign. The
 * parent's address comes only from the database, never from the request. No service key is used
 * (CLAUDE.md rule 2), and nothing about the people or the emails is logged (rule 12).
 * Who calls it: functions/api/data-request-parent/[[path]].ts on Cloudflare,
 * server/pages-functions-plugin.ts locally; src/features/data-requests/api/dataRequestParent.ts
 * calls both addresses.
 */
import {
  parentLinkFailures,
  parentLinkRequestSchema,
  type ParentLinkFailure,
} from '../src/schemas/dataRequestParent';

import type { EmailSender, SendEmail } from './contact';
import {
  parentEmail,
  type ParentEmailKind,
  type ParentEmailLanguage,
} from './data-request-parent/emails';
import { newConsentToken } from './parent-consent';
import { consentDate } from './parent-consent/emails';
import { bearerToken } from './picture-check';
import { hmacHex } from './signup-context';
import { writtenLanguageFor } from '../src/schemas/interfaceLanguages';

/** What the handler needs from its surroundings. */
export interface DataRequestParentOptions {
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
type ReadyOptions = DataRequestParentOptions & { secret: string };

/** What the ask and send functions answer, for the email. */
interface ParentEmailDetails {
  parent_email: string;
  language: string;
  handle: string | null;
  reference: string;
  expires_at?: string;
}

/** Each address: the database function it calls, the link's purpose and the email it sends. */
const steps = {
  'POST ask': { purpose: 'ask', databaseFunction: 'admin_ask_data_request_parent', email: 'ask' },
  'POST send': {
    purpose: 'copy',
    databaseFunction: 'admin_send_data_request_parent_copy',
    email: 'copy',
  },
} as const satisfies Record<
  string,
  { purpose: string; databaseFunction: string; email: ParentEmailKind }
>;

/** One step of the table above. */
type Step = (typeof steps)[keyof typeof steps];

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<ParentLinkFailure, number> = {
  signed_out: 401,
  invalid: 400,
  not_allowed: 403,
  request_closed: 409,
  no_check_needed: 409,
  already_answered: 409,
  not_under_16: 409,
  no_parent_on_record: 409,
  identity_not_checked: 409,
  not_found: 404,
  unavailable: 503,
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
function fail(failure: ParentLinkFailure): Response {
  return json({ error: failure }, statusForFailure[failure]);
}

/**
 * The failure a database refusal maps to: its hint when we know it, otherwise not_allowed for a
 * refused staff check and unavailable for anything else.
 *
 * @param hint - Postgres's hint, or null when the database couldn't be reached
 * @param status - the HTTP status the database answered
 * @returns the failure
 */
export function failureOf(hint: string | null, status: number): ParentLinkFailure {
  const known = parentLinkFailures.find((failure) => failure === hint);
  if (known !== undefined) return known;
  if (status === 401 || status === 403) return 'not_allowed';
  return 'unavailable';
}

/**
 * Calls one staff function as the signed-in staff member.
 *
 * @returns the answer, or the failure
 */
async function callDatabase(
  options: ReadyOptions,
  name: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<{ details: ParentEmailDetails } | { failure: ParentLinkFailure }> {
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null) return { failure: 'unavailable' };
  const parsed = (await response.json().catch(() => null)) as unknown;
  if (response.ok) return { details: parsed as ParentEmailDetails };
  const hint = (parsed as { hint?: unknown } | null)?.hint;
  return { failure: failureOf(typeof hint === 'string' ? hint : null, response.status) };
}

/**
 * Writes and sends one email to the parent.
 *
 * @returns true when it left
 */
async function sendParentEmail(
  options: ReadyOptions,
  kind: ParentEmailKind,
  details: ParentEmailDetails,
  link: string,
): Promise<boolean> {
  const language: ParentEmailLanguage = writtenLanguageFor(details.language);
  const overrides = await options.readOverrides(language).catch(() => new Map<string, string>());
  const values = {
    handle: details.handle ?? '',
    reference: details.reference,
    link,
    date: details.expires_at === undefined ? '' : consentDate(details.expires_at, language),
  };
  const email = parentEmail(kind, details.parent_email, values, {
    language,
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
 * One address: a new signed link stored by the database, then the email with it.
 *
 * @returns { sent: true }, or { error } with its status
 */
async function makeParentLink(request: Request, options: ReadyOptions, step: Step) {
  // Step 1: a staff member's own sign-in and a request ID.
  const accessToken = bearerToken(request);
  if (accessToken === null) return fail('signed_out');
  const parsed = parentLinkRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid');
  const { requestId } = parsed.data;
  // Step 2: a token staff never see; the database keeps only its hash, signed.
  const { token, hash } = await newConsentToken();
  const payload = `data-request-${step.purpose}|${requestId}|${hash}`;
  const signature = await hmacHex(payload, options.secret);
  const stored = await callDatabase(
    options,
    step.databaseFunction,
    { target_request_id: requestId, token_hash: hash, signature },
    accessToken,
  );
  if ('failure' in stored) return fail(stored.failure);
  // Step 3: the email to the parent's address from the database; the token goes after "#".
  const link = `${new URL(request.url).origin}/data-request/parent#${token}`;
  const isSent = await sendParentEmail(options, step.email, stored.details, link);
  return isSent ? json({ sent: true }, 200) : fail('unavailable');
}

/**
 * Answers every /api/data-request-parent/ address.
 *
 * @param request - the request
 * @param options - the database, the secret and the email sender
 * @returns the answer; 404 for an unknown address; 503 without the secret
 * Errors: none thrown; nothing is logged.
 */
export async function handleDataRequestParent(
  request: Request,
  options: DataRequestParentOptions,
): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/^\/api\/data-request-parent\//, '');
  const call = `${request.method} ${path}`;
  // Step 1: without the secret nothing can be signed.
  if (!options.secret) return fail('unavailable');
  const ready = { ...options, secret: options.secret };
  // Step 2: the address.
  if (call === 'POST ask') return makeParentLink(request, ready, steps['POST ask']);
  if (call === 'POST send') return makeParentLink(request, ready, steps['POST send']);
  return json({ error: 'not_found' }, 404);
}
