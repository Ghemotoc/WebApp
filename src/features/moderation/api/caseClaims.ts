/**
 * Claiming a case and the picture a picture case is about (stories S1-E10-03b and S1-E10-05;
 * architecture 1.8.4: "A moderator claims a case; others see it is claimed").
 *
 * Who calls it: hooks/useCaseClaim.ts and hooks/useCasePicture.ts (the case page).
 * What it calls next: admin_claim_case(), admin_release_case() (…_s1_e10_03b_claiming.sql) and
 * admin_case_picture() (…_s1_e10_05_picture_check.sql). Each checks the caller's role and staff
 * session and writes the audit log. The picture itself is read through a signed address made
 * with the moderator's own sign-in: Storage lets moderation staff read a held picture, nobody else.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** The picture of a picture case, as the case page shows it. */
export interface CasePicture {
  kind: string;
  status: string;
  /** What each service flagged: labels and scores, never the picture. */
  flags: Record<string, Json | undefined>;
  provider: string | null;
  attempts: number;
  checkedAt: string | null;
  story: { slug: string; title: string } | null;
  /** A signed address that lasts ten minutes; null when Storage refused. */
  url: string | null;
}

/**
 * Claims a case for the caller.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case's ID
 * Errors: throws ModerationError('refused') when someone else claimed it in the last hour,
 *   'not_allowed' for anyone outside moderation staff.
 */
export async function claimCase(client: AppSupabaseClient, caseId: string): Promise<void> {
  const { error } = await client.rpc('admin_claim_case', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Lets go of the caller's claim (staff who act on the case may release anyone's).
 *
 * @param client - the shared Supabase client
 * @param caseId - the case's ID
 * Errors: throws ModerationError as claimCase does.
 */
export async function releaseCase(client: AppSupabaseClient, caseId: string): Promise<void> {
  const { error } = await client.rpc('admin_release_case', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/** Reads a text field of a JSON object, or null. */
function textOf(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Reads the story a cover belongs to, or null. */
function storyOf(value: Json | undefined): CasePicture['story'] {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return null;
  return { slug: textOf(value, 'slug') ?? '', title: textOf(value, 'title') ?? '' };
}

/**
 * Reads admin_case_picture()'s answer, without the address.
 *
 * @param data - the JSON object
 * @returns the picture's details
 */
function pictureDetailsFrom(data: Record<string, Json | undefined>): Omit<CasePicture, 'url'> {
  const flags = data.flags;
  return {
    kind: textOf(data, 'kind') ?? 'cover',
    status: textOf(data, 'status') ?? 'held',
    flags: flags !== null && typeof flags === 'object' && !Array.isArray(flags) ? flags : {},
    provider: textOf(data, 'provider'),
    attempts: typeof data.attempts === 'number' ? data.attempts : 0,
    checkedAt: textOf(data, 'checked_at'),
    story: storyOf(data.story),
  };
}

/**
 * The picture a picture case is about, with a short-lived address to look at it.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case's ID
 * @returns the picture, or null when the case isn't about a picture
 * Errors: throws ModerationError('not_allowed') for anyone who can't see the case.
 */
export async function fetchCasePicture(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CasePicture | null> {
  const { data, error } = await client.rpc('admin_case_picture', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  // Ten minutes: long enough to look, short enough that a copied address soon stops working.
  const signed = await client.storage
    .from(textOf(data, 'bucket') ?? '')
    .createSignedUrl(textOf(data, 'path') ?? '', 600);
  return { ...pictureDetailsFrom(data), url: signed.error === null ? signed.data.signedUrl : null };
}

/**
 * The flags as one line each: "sightengine.gore: 0.82".
 *
 * @param flags - what the services said
 * @returns the lines
 */
export function flagLines(flags: CasePicture['flags']): string[] {
  return Object.entries(flags).map(([label, value]) => `${label}: ${String(value)}`);
}

/**
 * Says whether the services matched known abuse material: Arachnid Shield's classification, or
 * the local stand-in's match.
 *
 * @param flags - what the services said
 * @returns true for a match
 */
export function isKnownAbuseMatch(flags: CasePicture['flags']): boolean {
  return flags['arachnid.classification'] !== undefined || flags['stub.known_match'] === true;
}
