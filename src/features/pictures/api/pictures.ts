/**
 * Reading uploaded pictures: a picture's state and a signed address for the screens, a story's
 * uploaded cover, the caller's own pictures, and asking for (or retrying) a picture's check
 * (stories S1-E10-05, S1-E3-09, S1-E17-11, S1-E8-06 and S1-E8-08; CLAUDE.md rule 19: every
 * uploaded picture is checked before anyone else sees it). Uploading lives in ./pictureUploads.ts,
 * so the upload code stays out of the script every page loads (CI-3, 11 Nov 2026).
 *
 * Who calls it: the hooks in ../hooks (covers on cards, the story page and the teaser; the quiet
 * retry in AppLayout), the chapter reader (get_chapter()'s pictures), and ./pictureUploads.ts.
 * What it calls next: Supabase Storage for signed addresses, the database functions
 * story_cover_picture(), my_pending_pictures() and my_picture_states()
 * (…_s1_e10_05_picture_check.sql, …_s1_e3_09_chapter_pictures.sql), and POST /api/picture-check
 * (server/picture-check.ts), which runs the checks with the person's own sign-in.
 * A picture is shown only through a signed address that lasts 30 minutes; Storage refuses one for a
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
  /** A signed address that lasts 30 minutes; null when the caller may not see the file. */
  url: string | null;
}

/** The buckets people upload to: covers, profile pictures, chapter pictures (S1-E3-09), Story
 * Atlas pictures (S1-E17-11), space banners (FORUMS-2c), signature pictures (S1-E8-08) and
 * landing page pictures (S1-E11-14, CONTESTS-13a2a), sponsor creatives (S1-E12-02, SPONSORS-b2),
 * brand logos and emblems (BRAND-1a) and a reader's own quote card background (GAPS-7). */
export type PictureBucket =
  | 'covers'
  | 'avatars'
  | 'chapter-images'
  | 'atlas-images'
  | 'space-banners'
  | 'signature-pictures'
  | 'landing-pictures'
  | 'sponsor-creatives'
  | 'brand-assets'
  | 'quote-card-pictures';

/**
 * Signed addresses last 30 minutes (was an hour); the queries read them again before that. Kept short because a
 * signed address works for anyone who has it, so a copied link stops working soon (QA-1b, finding C1).
 */
const signedAddressSeconds = 30 * 60;

/** A picture as the database describes it: its state and, when the caller may read it, its file. */
export interface StoredPicture {
  state: PictureState;
  bucket: string | null;
  path: string | null;
}

/**
 * Reads picture_state_json() from the database.
 *
 * @param json - {state, bucket, path} or null
 * @returns the state and where the file is, or null when there is no picture
 */
export function pictureFromJson(json: Json | null): StoredPicture | null {
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
 * Turns a picture the database described into what a screen draws, with a signed address.
 *
 * @param client - the shared Supabase client
 * @param picture - the picture (from pictureFromJson()), or null
 * @returns the view, or null when there is no picture
 */
export async function pictureViewOf(
  client: AppSupabaseClient,
  picture: StoredPicture | null,
): Promise<PictureView | null> {
  if (picture === null) return null;
  // A removed picture is never drawn, even for its uploader.
  if (picture.state === 'removed') return { state: 'removed', url: null };
  return { state: picture.state, url: await signedAddress(client, picture.bucket, picture.path) };
}

/**
 * Turns the database's answer into what a screen draws.
 *
 * @returns the view, or null when there is no picture
 */
async function viewFrom(client: AppSupabaseClient, json: Json | null): Promise<PictureView | null> {
  return pictureViewOf(client, pictureFromJson(json));
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
 * Turns {"<ID>": picture_state_json} into what the screens draw, with a signed address for each
 * picture the caller may see.
 *
 * @param client - the shared Supabase client
 * @param json - the map from get_chapter() or my_picture_states()
 * @returns the views by picture ID; entries that aren't pictures are left out
 */
export async function pictureViewsFromJson(
  client: AppSupabaseClient,
  json: Json | null | undefined,
): Promise<Record<string, PictureView>> {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return {};
  }
  const entries = await Promise.all(
    Object.entries(json).map(async ([pictureId, value]) => {
      const view = await viewFrom(client, value ?? null);
      return [pictureId, view] as const;
    }),
  );
  const views: Record<string, PictureView> = {};
  for (const [pictureId, view] of entries) if (view !== null) views[pictureId] = view;
  return views;
}

/**
 * The caller's own pictures, for the editor and the writer's preview (S1-E3-09).
 *
 * @param client - the shared Supabase client
 * @param pictureIds - the pictures in the text
 * @returns the views by picture ID; anyone else's pictures are left out by the database
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyPictureStates(
  client: AppSupabaseClient,
  pictureIds: string[],
): Promise<Record<string, PictureView>> {
  if (pictureIds.length === 0) return {};
  const { data, error } = await client.rpc('my_picture_states', { picture_ids: pictureIds });
  if (error !== null) throw new Error(`Could not read the pictures: ${error.message}`);
  return pictureViewsFromJson(client, data);
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
