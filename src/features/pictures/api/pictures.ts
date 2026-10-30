/**
 * Uploaded pictures: uploading a cover or a profile picture, asking for its check, and reading a
 * picture's state for the screens (story S1-E10-05; CLAUDE.md rule 19: every uploaded picture is
 * checked before anyone else sees it).
 *
 * Who calls it: the hooks in ../hooks (covers on cards, the story page and the teaser; the profile
 * picture; the upload fields in Story settings and Settings › Profile).
 * What it calls next: Supabase Storage (the private `covers` and `avatars` buckets), the database
 * functions register_picture(), story_cover_picture(), profile_avatar_picture() and
 * my_pending_pictures() (…_s1_e10_05_picture_check.sql), and POST /api/picture-check
 * (server/picture-check.ts), which runs the checks with the person's own sign-in.
 * A picture is shown only through a signed address that lasts an hour; Storage refuses one for a
 * picture that hasn't passed, unless the caller is the uploader or moderation staff.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import { pictureCheckResponseSchema } from '@/schemas/pictureCheck';

/** How a screen draws a picture. */
export type PictureState = 'visible' | 'checking' | 'waiting_for_person' | 'removed';

/** One picture as a screen draws it. */
export interface PictureView {
  state: PictureState;
  /** A signed address that lasts an hour; null when the caller may not see the file. */
  url: string | null;
}

/** The two buckets people upload to. */
export type PictureBucket = 'covers' | 'avatars';

/** The picture types the buckets accept, and the largest file each takes (the bucket limits). */
export const pictureTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const largestPictureBytes: Record<PictureBucket, number> = {
  covers: 5 * 1024 * 1024,
  avatars: 2 * 1024 * 1024,
};

/** Why an upload didn't work. */
export type PictureUploadFailure =
  'wrong_type' | 'too_big' | 'too_many' | 'not_allowed' | 'unreachable';

/** The error a failed upload throws; waitMinutes is set for too_many. */
export class PictureUploadError extends Error {
  constructor(
    public readonly failure: PictureUploadFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Picture upload failed: ${failure}`);
  }
}

/** Signed addresses last an hour; the queries refresh well before that. */
const signedAddressSeconds = 60 * 60;

/**
 * Reads picture_state_json() from the database.
 *
 * @param json - {state, bucket, path} or null
 * @returns the state and where the file is, or null when there is no picture
 */
export function pictureFromJson(
  json: Json | null,
): { state: PictureState; bucket: string | null; path: string | null } | null {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null;
  const states: PictureState[] = ['visible', 'checking', 'waiting_for_person', 'removed'];
  const state = states.find((candidate) => candidate === json.state) ?? 'checking';
  const bucket = typeof json.bucket === 'string' ? json.bucket : null;
  const path = typeof json.path === 'string' ? json.path : null;
  return { state, bucket, path };
}

/**
 * Asks Storage for a signed address of one file.
 *
 * @returns the address, or null when Storage refuses (the caller may not see the file)
 */
async function signedAddress(
  client: AppSupabaseClient,
  bucket: string | null,
  path: string | null,
): Promise<string | null> {
  if (bucket === null || path === null) return null;
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, signedAddressSeconds);
  return error === null ? data.signedUrl : null;
}

/**
 * Turns the database's answer into what a screen draws.
 *
 * @returns the view, or null when there is no picture
 */
async function viewFrom(client: AppSupabaseClient, json: Json | null): Promise<PictureView | null> {
  const picture = pictureFromJson(json);
  if (picture === null) return null;
  // A removed picture is never drawn, even for its uploader.
  if (picture.state === 'removed') return { state: 'removed', url: null };
  return { state: picture.state, url: await signedAddress(client, picture.bucket, picture.path) };
}

/**
 * A story's uploaded cover.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @returns the view, or null when the story has no uploaded cover the caller can see
 * Errors: throws when the database can't be reached.
 */
export async function fetchStoryCoverPicture(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<PictureView | null> {
  const { data, error } = await client.rpc('story_cover_picture', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read the cover: ${error.message}`);
  return viewFrom(client, data);
}

/**
 * A profile's picture (for one's own profile, the newest one still in its check).
 *
 * @param client - the shared Supabase client
 * @param handle - the username, without "@"
 * @returns the view, or null when there is none
 * Errors: throws when the database can't be reached.
 */
export async function fetchAvatarPicture(
  client: AppSupabaseClient,
  handle: string,
): Promise<PictureView | null> {
  const { data, error } = await client.rpc('profile_avatar_picture', { profile_handle: handle });
  if (error !== null) throw new Error(`Could not read the profile picture: ${error.message}`);
  return viewFrom(client, data);
}

/**
 * Asks the server to check one registered picture, with the person's own sign-in.
 *
 * @param client - the shared Supabase client (for the sign-in token)
 * @param pictureId - the picture's ID from register_picture()
 * @param originalName - the file's own name (only the local stand-in reads it)
 * @returns the picture's status afterwards; "pending" when the check couldn't run this time
 */
export async function requestPictureCheck(
  client: AppSupabaseClient,
  pictureId: string,
  originalName: string,
): Promise<string> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) return 'pending';
  const response = await fetch('/api/picture-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pictureId, originalName: originalName.slice(0, 200) }),
  }).catch(() => null);
  if (response === null || !response.ok) return 'pending';
  const parsed = pictureCheckResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.status : 'pending';
}

/**
 * Checks a chosen file before uploading: the type and the size the bucket takes.
 *
 * @throws PictureUploadError wrong_type or too_big
 */
export function checkPictureFile(file: File, bucket: PictureBucket): void {
  if (!pictureTypes.some((type) => type === file.type)) throw new PictureUploadError('wrong_type');
  if (file.size > largestPictureBytes[bucket]) throw new PictureUploadError('too_big');
}

/** The file ending for a picture type. */
function endingFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

/** Reads the minutes to wait from a rate-limit error's hint ("wait_minutes:12"). */
function waitMinutesFrom(hint: string | undefined): number | null {
  const match = /wait_minutes:(\d+)/.exec(hint ?? '');
  return match?.[1] === undefined ? null : Number(match[1]);
}

/** What an upload needs. */
export interface PictureUpload {
  bucket: PictureBucket;
  /** covers: the story's ID as the folder; avatars: no folder. */
  folder: string | null;
  kind: 'cover' | 'avatar';
  file: File;
}

/**
 * Uploads a picture under a fresh random name, registers it and asks for its check.
 *
 * @param client - the shared Supabase client
 * @param upload - where it goes and the file
 * @returns the stored path and the picture's status after the check
 * @throws PictureUploadError for every refusal: the file, the switch or the account (not_allowed),
 *   the hourly limit (too_many, with the minutes to wait), or the network (unreachable)
 */
export async function uploadPicture(
  client: AppSupabaseClient,
  upload: PictureUpload,
): Promise<{ path: string; status: string }> {
  // Step 1: the file itself, before anything is sent.
  checkPictureFile(upload.file, upload.bucket);
  // Step 2: a random name, never the user ID (architecture 1.6), inside the story's folder.
  const fileName = `${crypto.randomUUID()}.${endingFor(upload.file.type)}`;
  const path = upload.folder === null ? fileName : `${upload.folder}/${fileName}`;
  const stored = await client.storage
    .from(upload.bucket)
    .upload(path, upload.file, { contentType: upload.file.type });
  if (stored.error !== null) throw new PictureUploadError('not_allowed');
  // Step 3: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_picture', {
    target_bucket: upload.bucket,
    target_path: path,
    picture_kind: upload.kind,
  });
  if (registered.error !== null) {
    if (registered.error.code === '54000') {
      throw new PictureUploadError('too_many', waitMinutesFrom(registered.error.hint));
    }
    throw new PictureUploadError(registered.error.code === '' ? 'unreachable' : 'not_allowed');
  }
  // Step 4: the check; a service that is down leaves it pending, tried again later.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { path, status };
}

/**
 * Asks again for every picture of the caller's still waiting for the services (a service was
 * down when it was uploaded). At most five tries each, so a broken file isn't sent forever.
 *
 * @param client - the shared Supabase client
 * @returns how many were asked about
 */
export async function retryPendingPictures(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('my_pending_pictures');
  if (error !== null) return 0;
  const waiting = data.filter((picture) => picture.attempts < 5);
  for (const picture of waiting) await requestPictureCheck(client, picture.picture_id, '');
  return waiting.length;
}
