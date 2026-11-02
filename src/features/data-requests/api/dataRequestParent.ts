/**
 * A data request's parent path, front end (bundle ADMIN-2, part c3; story S1-E11-09 criterion 5
 * and "for a parent, a one-time link to the checked email address").
 *
 * Two sides:
 * - staff: postParentLink() asks our server (server/data-request-parent.ts) to email the parent the
 *   check link ("ask") or the one-time link to the copy ("send"). The server signs the link; staff
 *   never see it;
 * - the parent, signed out: fetchParentLink(), answerParentCheck() and openParentCopy(), with the
 *   token from the link as the key (data_request_parent_link(), answer_data_request_parent() and
 *   open_data_request_parent_copy() in supabase/migrations/…_admin2_c3_data_request_parent.sql).
 *   The files then download with Download my data's ExportDownloadButton, which policy
 *   exports_select_parent_link allows within the link's hour.
 * Who calls it: api/dataRequests.ts (staff actions) and hooks/useParentLink.ts (the parent's page).
 */
import { z } from 'zod';

import type { AppSupabaseClient } from '@/lib/supabase';

import { parentLinkFailures } from '../../../schemas/dataRequestParent';

import { DataRequestError, type DataRequestFailure } from './dataRequests';

/** Which link staff send: the identity check, or the copy. */
export type ParentLinkKind = 'ask' | 'send';

/** The server's refusal, as server/data-request-parent.ts answers it. */
const refusalSchema = z.object({ error: z.enum(parentLinkFailures) });

/**
 * The staff page's failure for a refusal from our server.
 *
 * @returns the failure: a signed-out or refused staff check is not_allowed; a server that couldn't
 *   reach the database or send the email is parent_email_failed
 */
function failureFromServer(error: z.infer<typeof refusalSchema>['error']): DataRequestFailure {
  if (error === 'signed_out' || error === 'not_allowed') return 'not_allowed';
  if (error === 'unavailable' || error === 'invalid') return 'parent_email_failed';
  return error;
}

/**
 * Staff ask our server to email the parent a link.
 *
 * @param client - the shared Supabase client (for the staff member's sign-in token)
 * @param kind - ask (the identity check) or send (the copy)
 * @param requestId - the request
 * Errors: throws DataRequestError (not_allowed, request_closed, no_check_needed,
 *   already_answered, not_under_16, no_parent_on_record, identity_not_checked, not_found,
 *   parent_email_failed).
 */
export async function postParentLink(
  client: AppSupabaseClient,
  kind: ParentLinkKind,
  requestId: string,
): Promise<void> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new DataRequestError('not_allowed');
  const response = await fetch(`/api/data-request-parent/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requestId }),
  }).catch(() => null);
  if (response === null) throw new DataRequestError('parent_email_failed');
  if (response.ok) return;
  const refusal = refusalSchema.safeParse(await response.json().catch(() => null));
  throw new DataRequestError(
    refusal.success ? failureFromServer(refusal.data.error) : 'parent_email_failed',
  );
}

/** Where a copy link stands: not opened yet, open for the hour, used, or its files are gone. */
export type ParentCopyState = 'ready' | 'open' | 'used' | 'expired';

/** The shape data_request_parent_link() answers. */
const parentLinkSchema = z.union([
  z.object({ outcome: z.literal('gone') }),
  z.object({
    outcome: z.literal('ok'),
    link: z.literal('check'),
    language: z.enum(['ro', 'en']),
    handle: z.string().nullable(),
    reference: z.string(),
    request_type: z.string(),
    received_on: z.string(),
    identity: z.enum(['not_needed', 'not_asked', 'asked', 'confirmed', 'denied']),
  }),
  z.object({
    outcome: z.literal('ok'),
    link: z.literal('copy'),
    language: z.enum(['ro', 'en']),
    handle: z.string().nullable(),
    reference: z.string(),
    state: z.enum(['ready', 'open', 'used', 'expired']),
    open_until: z.string().nullable(),
    expires_at: z.string().nullable(),
  }),
]);

/** What the parent's page shows for a check link. */
export interface ParentCheckLink {
  link: 'check';
  language: 'ro' | 'en';
  handle: string;
  reference: string;
  /** "copy" or "move": what was asked for. */
  requestType: string;
  receivedOn: string;
  /** asked (waiting for the parent), confirmed or denied. */
  identity: string;
}

/** What the parent's page shows for a copy link. */
export interface ParentCopyLink {
  link: 'copy';
  language: 'ro' | 'en';
  handle: string;
  reference: string;
  state: ParentCopyState;
  openUntil: string | null;
  expiresAt: string | null;
}

/** Either link, or null for one that doesn't work. */
export type ParentLink = ParentCheckLink | ParentCopyLink | null;

/** Why the parent's page couldn't load or act. */
export class ParentLinkError extends Error {
  constructor() {
    super('The data request link could not be read.');
    this.name = 'ParentLinkError';
  }
}

/**
 * Reads the database's answer about a link.
 *
 * @returns the link, or null for one that doesn't work
 * Errors: throws ParentLinkError for an answer of another shape.
 */
function parentLinkFrom(value: unknown): ParentLink {
  const parsed = parentLinkSchema.safeParse(value);
  if (!parsed.success) throw new ParentLinkError();
  const row = parsed.data;
  if (row.outcome === 'gone') return null;
  const shared = { language: row.language, handle: row.handle ?? '', reference: row.reference };
  if (row.link === 'check') {
    return {
      ...shared,
      link: 'check',
      requestType: row.request_type,
      receivedOn: row.received_on,
      identity: row.identity,
    };
  }
  return {
    ...shared,
    link: 'copy',
    state: row.state,
    openUntil: row.open_until,
    expiresAt: row.expires_at,
  };
}

/**
 * What a parent's link points to.
 *
 * @param token - the token from the link
 * @returns the link, or null for one that doesn't work
 * Errors: throws ParentLinkError when the database can't be reached.
 */
export async function fetchParentLink(
  client: AppSupabaseClient,
  token: string,
): Promise<ParentLink> {
  const { data, error } = await client.rpc('data_request_parent_link', { token });
  if (error !== null) throw new ParentLinkError();
  return parentLinkFrom(data);
}

/**
 * The parent's answer to "did you or your child ask for this?".
 *
 * @param isOurs - true for "yes, we asked for it"
 * @returns true when it was stored; false when the link no longer works or was already answered
 * Errors: throws ParentLinkError when the database can't be reached.
 */
export async function answerParentCheck(
  client: AppSupabaseClient,
  token: string,
  isOurs: boolean,
): Promise<boolean> {
  const { data, error } = await client.rpc('answer_data_request_parent', {
    token,
    is_ours: isOurs,
  });
  if (error !== null) throw new ParentLinkError();
  return (data as { outcome?: unknown } | null)?.outcome === 'ok';
}

/** One file of the copy, as the parent sees it. */
export interface ParentCopyFile {
  /** The random name in the bucket, to download it by. */
  fileName: string;
  /** "D-000012-copy.zip". */
  displayName: string;
  fileSize: number | null;
}

/** The shape open_data_request_parent_copy() answers. */
const openedCopySchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.enum(['gone', 'used', 'expired']) }),
  z.object({
    outcome: z.literal('ok'),
    open_until: z.string(),
    files: z.array(
      z.object({
        file_name: z.string(),
        display_name: z.string(),
        file_size: z.number().nullable(),
      }),
    ),
  }),
]);

/** What opening the copy gives: the files until when, or why not. */
export type OpenedParentCopy =
  | { outcome: 'ok'; openUntil: string; files: ParentCopyFile[] }
  | { outcome: 'gone' | 'used' | 'expired' };

/**
 * Opens the copy: the first time starts the link's one hour.
 *
 * @returns the files, or why the link no longer opens
 * Errors: throws ParentLinkError when the database can't be reached.
 */
export async function openParentCopy(
  client: AppSupabaseClient,
  token: string,
): Promise<OpenedParentCopy> {
  const { data, error } = await client.rpc('open_data_request_parent_copy', { token });
  if (error !== null) throw new ParentLinkError();
  const parsed = openedCopySchema.safeParse(data);
  if (!parsed.success) throw new ParentLinkError();
  if (parsed.data.outcome !== 'ok') return { outcome: parsed.data.outcome };
  return {
    outcome: 'ok',
    openUntil: parsed.data.open_until,
    files: parsed.data.files.map((file) => ({
      fileName: file.file_name,
      displayName: file.display_name,
      fileSize: file.file_size,
    })),
  };
}
