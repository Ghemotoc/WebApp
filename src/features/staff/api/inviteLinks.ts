/**
 * Makes, lists and revokes invite links, for /staff/users/invites (story S1-E11-17).
 *
 * Who calls it: hooks/useInviteLinks.ts.
 * What it calls next: admin_create_invite(), admin_list_invites() and admin_revoke_invite()
 * (…_s1_e11_17_invite_links.sql). Each checks the caller's role and staff session itself and
 * writes the audit log; this file only passes the answers on. The code comes back once, from
 * admin_create_invite(); the database keeps only its hash.
 */
import { brand } from '@/config/brand';
import type { AppSupabaseClient } from '@/lib/supabase';

/** An invite link's state, as the database works it out. */
export type InviteStatus = 'active' | 'used_up' | 'expired' | 'revoked';

/** One invite link on the list. Never who used it. */
export interface InviteLink {
  id: string;
  note: string | null;
  maxUses: number;
  useCount: number;
  expiresAt: string;
  revokedAt: string | null;
  status: InviteStatus;
  madeByHandle: string | null;
  createdAt: string;
}

/** What the admin asks for. */
export interface NewInviteRequest {
  admits: number;
  validDays: number;
  note: string;
}

/** The answer, shown once. */
export interface NewInvite {
  id: string;
  code: string;
  link: string;
  expiresAt: string;
}

/** Why a call was refused, in words the page can explain. */
export type InviteFailure = 'not_allowed' | 'refused' | 'unreachable';

/** The error a refused call throws. */
export class InviteError extends Error {
  constructor(public readonly failure: InviteFailure) {
    super(`Invite link call failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501), refused (23514: a limit or the note) or unreachable
 */
function failureFromCode(code: string | undefined): InviteFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514') return 'refused';
  return 'unreachable';
}

/**
 * The status as a known value (the database returns text).
 *
 * @param status - as admin_list_invites() returns it
 * @returns the status; an unknown word counts as revoked, the safest reading
 */
function statusOf(status: string | null): InviteStatus {
  if (status === 'active' || status === 'used_up' || status === 'expired') return status;
  return 'revoked';
}

/**
 * The address a link opens: sign-up with the code filled in (S1-E2-01). The site address comes
 * from the brand config, never from code (CLAUDE.md, names and domains are settings).
 *
 * @param code - the invite code
 * @returns the full link
 */
export function inviteLinkFor(code: string): string {
  return `${brand.siteUrl}/join/${code}`;
}

/**
 * Lists every platform invite link, newest first.
 *
 * @param client - the shared Supabase client
 * @returns the links
 * Errors: throws InviteError('not_allowed') for anyone but owner and admin.
 */
export async function listInviteLinks(client: AppSupabaseClient): Promise<InviteLink[]> {
  const { data, error } = await client.rpc('admin_list_invites');
  if (error !== null) throw new InviteError(failureFromCode(error.code));
  return data.map((row) => ({
    id: row.id ?? '',
    note: row.note,
    maxUses: row.max_uses ?? 0,
    useCount: row.use_count ?? 0,
    expiresAt: row.expires_at ?? '',
    revokedAt: row.revoked_at,
    status: statusOf(row.status),
    madeByHandle: row.made_by_handle,
    createdAt: row.created_at ?? '',
  }));
}

/**
 * Makes a link.
 *
 * @param client - the shared Supabase client
 * @param request - how many it admits, for how many days, and the private note
 * @returns the new link with its code, shown once
 * Errors: throws InviteError with the reason the database gave.
 */
export async function makeInviteLink(
  client: AppSupabaseClient,
  request: NewInviteRequest,
): Promise<NewInvite> {
  const { data, error } = await client.rpc('admin_create_invite', {
    admits: request.admits,
    valid_days: request.validDays,
    private_note: request.note.trim() === '' ? undefined : request.note.trim(),
  });
  if (error !== null) throw new InviteError(failureFromCode(error.code));
  const made = data[0];
  if (made === undefined || made.code === null) throw new InviteError('unreachable');
  return {
    id: made.invite_id ?? '',
    code: made.code,
    link: inviteLinkFor(made.code),
    expiresAt: made.expires_at ?? '',
  };
}

/**
 * Revokes a link.
 *
 * @param client - the shared Supabase client
 * @param inviteId - which link
 * @param reason - why, for the audit log
 * Errors: throws InviteError with the reason the database gave.
 */
export async function revokeInviteLink(
  client: AppSupabaseClient,
  inviteId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_revoke_invite', {
    target_invite_id: inviteId,
    reason_given: reason,
  });
  if (error !== null) throw new InviteError(failureFromCode(error.code));
}
