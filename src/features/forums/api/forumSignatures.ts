/**
 * Forum signatures: the short line under a person's posts and on their profile, and a
 * moderator's request to change a signature or a space's banner within 24 hours (story S1-E8-08;
 * boards 6.1 and 5.2).
 *
 * The rules live in the database: at most 300 characters and three lines, one still picture that
 * passed its check, and a moderator's request that removes an unchanged signature or banner after
 * 24 hours (Q29). This file only reads and sends.
 * Who calls it: hooks/useForumSignatures.ts. What it calls next: set_my_signature(),
 * my_signature(), profile_signature(), space_banner_change_request() and
 * admin_request_customisation_change() (supabase/migrations/…_forums2_d_signatures.sql), and
 * uploadSignaturePicture(), pictureViewOf() and deleteStoredPicture() in the pictures feature.
 */
import {
  deleteStoredPicture,
  pictureFromJson,
  pictureViewOf,
  uploadSignaturePicture,
  type PictureView,
  type StoredPicture,
} from '@/features/pictures/api/pictures';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The most a signature may hold (S1-E8-08 criterion 1; the database checks the same). */
export const signatureMaxLength = 300;
export const signatureMaxLines = 3;

/** A signature as the screens draw it: its words and its picture, each optional. */
export interface ForumSignature {
  text: string | null;
  picture: StoredPicture | null;
}

/** A moderator's open request to change something within 24 hours. */
export interface ChangeRequest {
  reason: string;
  /** When it is removed if left unchanged. */
  dueAt: string;
}

/** The person's own signature for Settings. */
export interface MySignature {
  signature: ForumSignature | null;
  /** The picture's ID, so saving new words keeps the same picture. */
  pictureId: string | null;
  changeRequest: ChangeRequest | null;
}

/** Why saving or asking was refused. */
export type SignatureFailure =
  | 'too_long'
  | 'too_many_lines'
  | 'read_only'
  | 'nothing_to_change'
  | 'already_asked'
  | 'unreachable';

/** The error a refused save or request throws. */
export class SignatureError extends Error {
  constructor(public readonly failure: SignatureFailure) {
    super(`Signature change refused: ${failure}`);
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, SignatureFailure> = {
  'signature:too_long': 'too_long',
  'signature:too_many_lines': 'too_many_lines',
  'change:nothing': 'nothing_to_change',
  'change:open': 'already_asked',
};

/**
 * Turns a database error into the person's reason.
 *
 * @param error - the error Supabase returned
 * @returns the error to throw
 */
function signatureErrorFrom(error: { code: string; hint?: string }): SignatureError {
  const known = failureForHint[error.hint ?? ''];
  if (known !== undefined) return new SignatureError(known);
  // 42501: the account may not write (the account gate) or isn't staff.
  if (error.code === '42501') return new SignatureError('read_only');
  return new SignatureError('unreachable');
}

/** Reads any JSON value as an object, or null. */
function objectOrNull(value: Json | undefined): Record<string, Json | undefined> | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return null;
  return value;
}

/**
 * Reads signature_json().
 *
 * @param value - {"text", "picture"} or null
 * @returns the signature, or null when there is none
 */
export function signatureFrom(value: Json | undefined): ForumSignature | null {
  const signature = objectOrNull(value);
  if (signature === null) return null;
  const text = typeof signature['text'] === 'string' ? signature['text'] : null;
  const picture = pictureFromJson(signature['picture'] ?? null);
  if (text === null && picture === null) return null;
  return { text, picture };
}

/**
 * Reads a {reason, due_at} request.
 *
 * @returns the request, or null when there is none
 */
export function changeRequestFrom(value: Json | undefined): ChangeRequest | null {
  const request = objectOrNull(value);
  if (request === null || typeof request['reason'] !== 'string') return null;
  return { reason: request['reason'], dueAt: String(request['due_at']) };
}

/**
 * The signed-in person's own signature and any open request to change it.
 *
 * @param client - the Supabase client
 * @returns the signature, its picture's ID and the request
 * @throws SignatureError unreachable when the database didn't answer
 */
export async function fetchMySignature(client: AppSupabaseClient): Promise<MySignature> {
  const { data, error } = await client.rpc('my_signature');
  if (error) throw signatureErrorFrom(error);
  const answer = objectOrNull(data) ?? {};
  const pictureId = answer['picture_id'];
  return {
    signature: signatureFrom(answer['signature']),
    pictureId: typeof pictureId === 'string' ? pictureId : null,
    changeRequest: changeRequestFrom(answer['change_request']),
  };
}

/**
 * A person's signature for their profile page.
 *
 * @param client - the Supabase client
 * @param handle - the profile's username
 * @returns the signature, or null when there is none or the reader may not see it
 * @throws SignatureError unreachable when the database didn't answer
 */
export async function fetchProfileSignature(
  client: AppSupabaseClient,
  handle: string,
): Promise<ForumSignature | null> {
  const { data, error } = await client.rpc('profile_signature', { wanted_handle: handle });
  if (error) throw signatureErrorFrom(error);
  return signatureFrom(data);
}

/**
 * Saves the signature's words and picture, then deletes a replaced picture's file.
 *
 * @param client - the Supabase client
 * @param change - the words (empty clears them) and the picture's ID (null for none)
 * @throws SignatureError too_long, too_many_lines, read_only or unreachable
 */
export async function saveMySignature(
  client: AppSupabaseClient,
  change: { text: string; pictureId: string | null },
): Promise<void> {
  const { data, error } = await client.rpc('set_my_signature', {
    signature_text: change.text,
    picture_id: change.pictureId ?? undefined,
  });
  if (error) throw signatureErrorFrom(error);
  // Step 2: the replaced picture's file goes too; Storage keeps one moderators still need.
  const oldFile = objectOrNull(objectOrNull(data)?.['old_file']);
  if (typeof oldFile?.['bucket'] === 'string' && typeof oldFile['path'] === 'string')
    await deleteStoredPicture(client, { bucket: oldFile['bucket'], path: oldFile['path'] });
}

/**
 * Uploads a new signature picture, has it checked and saves it with the current words.
 *
 * @param client - the Supabase client
 * @param change - the current words and the chosen file
 * @returns the picture's check status ("passed", "held", "pending")
 * @throws PictureUploadError for the file or the upload, SignatureError for the save
 */
export async function uploadMySignaturePicture(
  client: AppSupabaseClient,
  change: { text: string; file: File },
): Promise<string> {
  const uploaded = await uploadSignaturePicture(client, change.file);
  await saveMySignature(client, { text: change.text, pictureId: uploaded.pictureId });
  return uploaded.status;
}

/**
 * The signed address of a signature's picture.
 *
 * @param client - the Supabase client
 * @param picture - the picture, from signatureFrom()
 * @returns the view, or null when there is none
 */
export async function fetchSignaturePictureView(
  client: AppSupabaseClient,
  picture: StoredPicture | null,
): Promise<PictureView | null> {
  return pictureViewOf(client, picture);
}

/**
 * The open request to change a space's banner picture, for its settings page.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the request, or null when there is none
 * @throws SignatureError unreachable when the database didn't answer
 */
export async function fetchSpaceBannerChangeRequest(
  client: AppSupabaseClient,
  slug: string,
): Promise<ChangeRequest | null> {
  const { data, error } = await client.rpc('space_banner_change_request', { slug });
  if (error) throw signatureErrorFrom(error);
  return changeRequestFrom(data);
}

/** What a moderator asks to change: a person's signature or a space's banner picture. */
export interface ChangeRequestAsk {
  item: 'signature' | 'space_banner';
  /** The person's username, or the space's address. */
  reference: string;
  reason: string;
}

/**
 * A moderator asks for a signature or a banner to be changed within 24 hours (Q29). The owner is
 * told why; if nothing changes, the job removes it and sends a statement of reasons.
 *
 * @param client - the Supabase client
 * @param ask - what, whose and why
 * @throws SignatureError nothing_to_change, already_asked, read_only (not staff) or unreachable
 */
export async function requestCustomisationChange(
  client: AppSupabaseClient,
  ask: ChangeRequestAsk,
): Promise<void> {
  const { error } = await client.rpc('admin_request_customisation_change', {
    item: ask.item,
    reference: ask.reference,
    reason: ask.reason,
  });
  if (error) throw signatureErrorFrom(error);
}
