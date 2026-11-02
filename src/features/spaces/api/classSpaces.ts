/**
 * Class spaces' invite codes and joining a class (bundle CLASSES, part a; story S1-E8-11).
 *
 * The teacher (or a space moderator with the members power, or our moderation team) makes a code
 * for a private class space; the code is shown once, because only its hash is kept, and making a
 * new one stops the old one. A student opens the link, sees which class it is for and joins.
 * Who calls it: hooks/useClassSpaces.ts. What it calls next: make_class_invite(),
 * end_class_invite(), class_invite(), class_invite_preview() and join_class_space() in
 * supabase/migrations/…_classes_a_class_spaces.sql. The database checks every rule; this file
 * only reads its answers and turns refusals into ClassInviteError.
 */
import { brand } from '@/config/brand';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The class's working code, as its card shows it: never the code itself. */
export interface ClassInviteStatus {
  expiresAt: string;
  admits: number;
  used: number;
}

/** A code just made: shown this once. */
export interface NewClassInvite {
  code: string;
  /** The page a student opens: <site>/class/<code> (the site address from the brand config). */
  link: string;
  expiresAt: string;
  admits: number;
}

/** What a code is for, on the join page. */
export type ClassInvitePreview =
  | { status: 'valid'; space: { slug: string; name: string } }
  | { status: 'ended' }
  | { status: 'unknown' };

/** The result of joining. */
export interface JoinedClass {
  slug: string;
  /** False while the account gate doesn't let the student write yet (age check, a parent). */
  canRead: boolean;
}

/** Why the database refused. */
export type ClassInviteFailure =
  | 'signed_out'
  | 'not_allowed'
  | 'missing'
  | 'ended'
  | 'days'
  | 'admits'
  | 'too_many'
  | 'unreachable';

/** The error a refused call throws. */
export class ClassInviteError extends Error {
  constructor(readonly failure: ClassInviteFailure) {
    super(`The class invite call was refused: ${failure}`);
    this.name = 'ClassInviteError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, ClassInviteFailure> = {
  signed_out: 'signed_out',
  'space:not_allowed': 'not_allowed',
  'space:missing': 'missing',
  'space:not_class': 'missing',
  'invite:ended': 'ended',
  'invite:days': 'days',
  'invite:admits': 'admits',
};

/**
 * Turns a database error into a ClassInviteError.
 *
 * @param error - Postgres's code and hint
 * @returns the failure, by hint; too_many for the spam limit; unreachable for anything else
 */
export function classInviteErrorFrom(error: {
  code?: string;
  hint?: string | null;
}): ClassInviteError {
  if (error.code === '54000') return new ClassInviteError('too_many');
  const failure = failureForHint[error.hint ?? ''];
  if (failure !== undefined) return new ClassInviteError(failure);
  // A signed-out caller can't run the function at all: Postgres refuses with 42501 and no hint.
  if (error.code === '42501') return new ClassInviteError('signed_out');
  return new ClassInviteError('unreachable');
}

/** A JSON object as the database sends it. */
type JsonObject = Record<string, Json | undefined>;

/**
 * Reads a JSON value as an object.
 *
 * @param value - any JSON value
 * @returns the object, or null for anything else
 */
function objectOrNull(value: Json | undefined): JsonObject | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return null;
  return value;
}

/**
 * The link a student opens for a code.
 *
 * @param code - the code
 * @returns the full link, from the brand config's site address (never hard-coded)
 */
export function classInviteLink(code: string): string {
  return `${brand.siteUrl}/class/${code}`;
}

/**
 * Reads the class's working code for its card.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the status, or null when no code works now
 * @throws ClassInviteError when refused
 */
export async function fetchClassInvite(
  client: AppSupabaseClient,
  slug: string,
): Promise<ClassInviteStatus | null> {
  const { data, error } = await client.rpc('class_invite', { slug });
  if (error) throw classInviteErrorFrom(error);
  const row = objectOrNull(data);
  if (row === null) return null;
  return {
    expiresAt: String(row['expires_at']),
    admits: Number(row['admits'] ?? 0),
    used: Number(row['used'] ?? 0),
  };
}

/**
 * Makes a new code; the old one stops at once.
 *
 * @param client - the Supabase client
 * @param request - the space's address, how many days it works and how many it admits
 * @returns the code, shown this once, with its link
 * @throws ClassInviteError when refused
 */
export async function makeClassInvite(
  client: AppSupabaseClient,
  request: { slug: string; validDays: number; admits: number },
): Promise<NewClassInvite> {
  const { data, error } = await client.rpc('make_class_invite', {
    slug: request.slug,
    valid_days: request.validDays,
    admits: request.admits,
  });
  if (error) throw classInviteErrorFrom(error);
  const row = objectOrNull(data) ?? {};
  const code = String(row['code']);
  return {
    code,
    link: classInviteLink(code),
    expiresAt: String(row['expires_at']),
    admits: Number(row['admits'] ?? 0),
  };
}

/**
 * Stops the class's code now.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns true when a working code was stopped
 * @throws ClassInviteError when refused
 */
export async function endClassInvite(client: AppSupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await client.rpc('end_class_invite', { slug });
  if (error) throw classInviteErrorFrom(error);
  return data === true;
}

/**
 * Says which class a code is for, before joining.
 *
 * @param client - the Supabase client
 * @param code - the code from the link
 * @returns valid with the class's name, ended or unknown
 * @throws ClassInviteError when the database can't be reached
 */
export async function fetchClassInvitePreview(
  client: AppSupabaseClient,
  code: string,
): Promise<ClassInvitePreview> {
  const { data, error } = await client.rpc('class_invite_preview', { code });
  if (error) throw classInviteErrorFrom(error);
  const row = objectOrNull(data) ?? {};
  const space = objectOrNull(row['space']);
  if (row['status'] === 'valid' && space !== null) {
    return { status: 'valid', space: { slug: String(space['slug']), name: String(space['name']) } };
  }
  return row['status'] === 'ended' ? { status: 'ended' } : { status: 'unknown' };
}

/**
 * Joins the class with its code.
 *
 * @param client - the Supabase client
 * @param code - the code from the link
 * @returns the class's address and whether the student can read it yet
 * @throws ClassInviteError when refused (signed out, ended, too many tries)
 */
export async function joinClassSpace(
  client: AppSupabaseClient,
  code: string,
): Promise<JoinedClass> {
  const { data, error } = await client.rpc('join_class_space', { code });
  if (error) throw classInviteErrorFrom(error);
  const row = objectOrNull(data) ?? {};
  return { slug: String(row['slug']), canRead: row['can_read'] === true };
}
