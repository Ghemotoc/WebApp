/**
 * Parental consent's calls (story S1-E2-03; ADR 0011).
 *
 * Who calls it: the hooks in ../hooks/.
 * What it calls next:
 * - my_parental_consent() (…_s1_e2_03_parental_consent.sql): the writer's side: whether consent
 *   is needed, the email asked and the deadline;
 * - POST /api/parent-consent/request (server/parent-consent.ts) with the writer's own sign-in: our
 *   server makes the link and emails it, so the app never sees the token (criterion 1);
 * - parental_consent_request(token): the parent's side, read with the link's token;
 * - POST /api/parent-consent/answer: the parent's yes, no or withdrawal (criteria 2, 3 and 5).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  consentFailureSchema,
  type ConsentAnswer,
  type ConsentFailure,
  type ConsentLanguage,
  type ConsentRequest,
} from '../../../schemas/parentConsent';

/** Where a request stands: waiting for the parent, or what they answered. */
export type ConsentStatus = 'waiting' | 'agreed' | 'refused' | 'withdrawn';

/** What the writer's page knows. */
export interface MyParentConsent {
  /** The account waits for a parent or guardian before it can write. */
  needsConsent: boolean;
  /** The latest request's state, or null before the first email. */
  status: ConsentStatus | null;
  parentEmail: string | null;
  language: ConsentLanguage | null;
  sentAt: string | null;
  decidedAt: string | null;
  /** When the account is erased if nobody agrees. */
  deadline: string | null;
  /** A new email may be sent now. */
  canSend: boolean;
}

/** What my_parental_consent() answers. */
interface MyParentConsentRow {
  outcome: string;
  needs_consent: boolean;
  status: ConsentStatus | null;
  parent_email: string | null;
  language: ConsentLanguage | null;
  sent_at: string | null;
  decided_at: string | null;
  deadline: string | null;
  can_send: boolean;
}

/** What the parent's page knows, read with the link's token. */
export interface ConsentRequestDetails {
  status: ConsentStatus;
  language: ConsentLanguage;
  writerEmail: string;
  handle: string;
  birthYear: number | null;
  ageCheckPassed: boolean;
  deadline: string;
  decidedAt: string | null;
  privacyVersion: string | null;
  termsVersion: string | null;
}

/** What parental_consent_request() answers. */
interface ConsentRequestRow {
  outcome: string;
  status: ConsentStatus;
  language: ConsentLanguage;
  writer_email: string;
  handle: string;
  birth_year: number | null;
  age_check_passed: boolean;
  deadline: string;
  decided_at: string | null;
  privacy_version: string | null;
  terms_version: string | null;
}

/** The cache key of the writer's consent. */
export const myParentConsentQueryKey = (userId: string | null) => ['my-parent-consent', userId];

/**
 * Reads the writer's consent.
 *
 * @param client - the shared Supabase client
 * @returns the consent, or null without a live profile
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyParentConsent(
  client: AppSupabaseClient,
): Promise<MyParentConsent | null> {
  const answer = await client.rpc('my_parental_consent');
  if (answer.error !== null)
    throw new Error(`Could not read the parental consent: ${answer.error.message}`);
  const row = answer.data as unknown as MyParentConsentRow;
  if (row.outcome !== 'ok') return null;
  return {
    needsConsent: row.needs_consent,
    status: row.status,
    parentEmail: row.parent_email,
    language: row.language,
    sentAt: row.sent_at,
    decidedAt: row.decided_at,
    deadline: row.deadline,
    canSend: row.can_send,
  };
}

/**
 * Reads what a consent link points to.
 *
 * @param client - the shared Supabase client (signed out is fine: the token is the key)
 * @param token - the token from the link
 * @returns the details, or null for a link that no longer works
 * Errors: throws when the database can't be reached.
 */
export async function fetchConsentRequest(
  client: AppSupabaseClient,
  token: string,
): Promise<ConsentRequestDetails | null> {
  const answer = await client.rpc('parental_consent_request', { token });
  if (answer.error !== null)
    throw new Error(`Could not read the consent request: ${answer.error.message}`);
  const row = answer.data as unknown as ConsentRequestRow;
  if (row.outcome !== 'ok') return null;
  return {
    status: row.status,
    language: row.language,
    writerEmail: row.writer_email,
    handle: row.handle,
    birthYear: row.birth_year,
    ageCheckPassed: row.age_check_passed,
    deadline: row.deadline,
    decidedAt: row.decided_at,
    privacyVersion: row.privacy_version,
    termsVersion: row.terms_version,
  };
}

/** A request or an answer that didn't work, with the reason the page shows. */
export class ParentConsentError extends Error {
  readonly failure: ConsentFailure;

  constructor(failure: ConsentFailure) {
    super(`The parental consent step didn't work: ${failure}`);
    this.failure = failure;
  }
}

/**
 * Posts to our server and turns a refusal into a ParentConsentError.
 *
 * @returns nothing when the server said yes
 * @throws ParentConsentError with the server's reason, or unavailable
 */
async function postToServer(path: string, body: unknown, token?: string): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api/parent-consent/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null) throw new ParentConsentError('unavailable');
  if (response.ok) return;
  const failed = consentFailureSchema.safeParse(await response.json().catch(() => null));
  throw new ParentConsentError(failed.success ? failed.data.error : 'unavailable');
}

/**
 * Asks a parent or guardian: our server makes the link and emails it.
 *
 * @param client - the shared Supabase client (for the writer's sign-in token)
 * @param request - the parent's email and the email's language
 * @throws ParentConsentError signed_out, invalid, own_email, too_soon, not_needed or unavailable
 */
export async function sendConsentRequest(
  client: AppSupabaseClient,
  request: ConsentRequest,
): Promise<void> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new ParentConsentError('signed_out');
  await postToServer('request', request, token);
}

/**
 * Sends the parent's answer from the link.
 *
 * @param answer - the token, the decision, the page's language and the guardian box
 * @throws ParentConsentError invalid, gone, already_answered or unavailable
 */
export async function sendConsentAnswer(answer: ConsentAnswer): Promise<void> {
  await postToServer('answer', answer);
}
