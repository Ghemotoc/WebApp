/**
 * What both parent pages' server code shares (stories S1-E2-03 and S1-E2-03b): the options, JSON
 * answers, one database call, the link tokens and one consent email.
 * Who calls it: server/parent-consent.ts (the consent answer) and server/parent-consent/spotlight.ts
 * (the separate yes to suggestions). What it calls: the database's REST functions and the email
 * sender. Nothing about the people or the emails is logged (CLAUDE.md rule 12).
 */
import type { ConsentFailure, ConsentLanguage } from '../../src/schemas/parentConsent';
import type { EmailSender, SendEmail } from '../contact';

import { consentEmail, type ConsentEmailKind } from './emails';

/** What the handler needs from its surroundings. */
export interface ParentConsentOptions {
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
export type ReadyOptions = ParentConsentOptions & { secret: string };

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<ConsentFailure, number> = {
  signed_out: 401,
  invalid: 400,
  own_email: 409,
  too_soon: 429,
  not_needed: 409,
  gone: 404,
  already_answered: 409,
  unavailable: 503,
};

/** What a database call gives back: the answer, or Postgres's hint when it refused. */
export interface DatabaseAnswer<T> {
  data: T | null;
  hint: string | null;
}

/**
 * A JSON answer that no cache keeps.
 *
 * @returns the response
 */
export function json(body: unknown, status: number): Response {
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
export function fail(failure: ConsentFailure): Response {
  return json({ error: failure }, statusForFailure[failure]);
}

/**
 * Calls one database function, as the writer (their token) or as a visitor (the anon key).
 *
 * @returns the answer, or the hint Postgres gave with a refusal; both null when unreachable
 */
export async function callDatabase<T>(
  options: ParentConsentOptions,
  name: string,
  body: Record<string, unknown>,
  token: string | null,
): Promise<DatabaseAnswer<T>> {
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${token ?? options.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null) return { data: null, hint: null };
  const parsed = (await response.json().catch(() => null)) as unknown;
  if (response.ok) return { data: parsed as T, hint: null };
  const hint = (parsed as { hint?: unknown } | null)?.hint;
  return { data: null, hint: typeof hint === 'string' ? hint : 'refused' };
}

/**
 * A new link token: 32 random bytes as base64url, and its SHA-256 in hex.
 *
 * @returns the token for the email and the hash for the database
 */
export async function newConsentToken(): Promise<{ token: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return { token, hash: await sha256Hex(token) };
}

/**
 * The SHA-256 of a text, in hex, as Postgres's digest() writes it.
 *
 * @returns the hash
 */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The user ID inside a sign-in token. Not checked here: the database checks the token itself
 * and acts as auth.uid(), so a forged ID only makes the signature fail.
 *
 * @returns the ID, or null when the token can't be read
 */
export function userIdOf(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (payload === undefined) return null;
  try {
    const text = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    const sub = (JSON.parse(text) as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Writes and sends one consent email.
 *
 * @returns true when it left
 */
export async function sendConsentEmail(
  options: ReadyOptions,
  kind: ConsentEmailKind,
  to: string,
  details: { language: ConsentLanguage; values: Record<string, string> },
): Promise<boolean> {
  const overrides = await options
    .readOverrides(details.language)
    .catch(() => new Map<string, string>());
  const email = consentEmail(kind, to, details.values, {
    language: details.language,
    overrides,
    productName: options.productName,
    companyName: options.companyName,
  });
  return options.sendEmail(email, options.sender).then(
    () => true,
    () => false,
  );
}
