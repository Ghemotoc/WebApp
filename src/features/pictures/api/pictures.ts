/**
 * Uploaded pictures: uploading a cover, a profile picture, a picture in a chapter, a Story Atlas
 * picture, a space's banner or a forum signature picture, asking for its check, and reading a picture's state for the screens
 * (stories S1-E10-05, S1-E3-09, S1-E17-11, S1-E8-06 and S1-E8-08; CLAUDE.md
 * rule 19: every uploaded picture is checked before anyone else sees it). Every file is prepared
 * first (lib/preparePicture.ts: location data removed, resized).
 *
 * Who calls it: the hooks in ../hooks (covers on cards, the story page and the teaser; the profile
 * picture; the upload fields in Story settings and Settings › Profile).
 * What it calls next: Supabase Storage (the private `covers`, `avatars`, `chapter-images`,
 * `atlas-images`, `space-banners` and `signature-pictures` buckets), the database functions
 * register_picture(), register_chapter_picture(), register_atlas_picture(), register_space_banner(), register_space_logo(),
 * register_signature_picture(),
 * story_cover_picture(), my_pending_pictures() and my_picture_states()
 * (…_s1_e10_05_picture_check.sql, …_s1_e3_09_chapter_pictures.sql), and POST /api/picture-check
 * (server/picture-check.ts), which runs the checks with the person's own sign-in.
 * A picture is shown only through a signed address that lasts 30 minutes; Storage refuses one for a
 * picture that hasn't passed, unless the caller is the uploader or moderation staff.
 */
import { isAnimatedPicture } from '@/lib/animated-picture';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import { pictureCheckResponseSchema } from '@/schemas/pictureCheck';

import {
  endingForPreparedType,
  longestSideFor,
  PicturePreparationError,
  preparePicture,
} from '../lib/preparePicture';

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

/** The picture types the buckets accept, and the largest file each takes (the bucket limits). */
export const pictureTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const largestPictureBytes: Record<PictureBucket, number> = {
  covers: 5 * 1024 * 1024,
  avatars: 2 * 1024 * 1024,
  'chapter-images': 5 * 1024 * 1024,
  'atlas-images': 5 * 1024 * 1024,
  'space-banners': 5 * 1024 * 1024,
  'signature-pictures': 1 * 1024 * 1024,
  'landing-pictures': 5 * 1024 * 1024,
  'sponsor-creatives': 5 * 1024 * 1024,
  'brand-assets': 2 * 1024 * 1024,
  'quote-card-pictures': 5 * 1024 * 1024,
};

/** Why an upload didn't work. animated: a signature picture that moves (S1-E8-08). */
export type PictureUploadFailure =
  'wrong_type' | 'too_big' | 'too_many' | 'not_allowed' | 'unreachable' | 'animated';

/** The error a failed upload throws; waitMinutes is set for too_many. */
export class PictureUploadError extends Error {
  constructor(
    public readonly failure: PictureUploadFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Picture upload failed: ${failure}`);
  }
}

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
 * Checks a chosen file before uploading: the type and the size the bucket takes.
 *
 * @throws PictureUploadError wrong_type or too_big
 */
export function checkPictureFile(file: File, bucket: PictureBucket): void {
  if (!pictureTypes.some((type) => type === file.type)) throw new PictureUploadError('wrong_type');
  if (file.size > largestPictureBytes[bucket]) throw new PictureUploadError('too_big');
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
 * Checks the chosen file, prepares it (metadata out, made smaller, ../lib/preparePicture.ts) and
 * puts it in its bucket under a fresh random name, never the user ID (architecture 1.6).
 *
 * @param target - the bucket, the folder (the story's or chapter's ID, or null for a profile
 *   picture), the file and the longest side it may have
 * @returns the stored path
 * @throws PictureUploadError wrong_type, too_big, animated (a moving signature picture) or
 *   not_allowed (Storage refused it)
 */
export async function storePicture(
  client: AppSupabaseClient,
  target: { bucket: PictureBucket; folder: string | null; file: File; longestSide: number },
): Promise<string> {
  const { bucket, folder, file, longestSide } = target;
  // Step 1: the file itself, before anything is sent.
  checkPictureFile(file, bucket);
  // A signature takes one still picture (S1-E8-08 criterion 1): a moving one is refused in words,
  // even though redrawing it below would keep only its first frame.
  if (
    bucket === 'signature-pictures' &&
    isAnimatedPicture(new Uint8Array(await file.arrayBuffer()))
  )
    throw new PictureUploadError('animated');
  // Step 2: only its pixels, at the size it is shown (S1-E3-09 criterion 2).
  const prepared = await preparePicture(file, longestSide).catch((error: unknown) => {
    throw error instanceof PicturePreparationError ? new PictureUploadError('wrong_type') : error;
  });
  // Step 3: a random name inside the folder.
  const fileName = `${crypto.randomUUID()}.${endingForPreparedType(prepared.type)}`;
  const path = folder === null ? fileName : `${folder}/${fileName}`;
  const stored = await client.storage
    .from(bucket)
    .upload(path, prepared, { contentType: prepared.type });
  if (stored.error !== null) throw new PictureUploadError('not_allowed');
  return path;
}

/**
 * Turns a refused registration into the person's reason.
 *
 * @param error - the error the database returned
 * @returns the error to throw
 */
export function registrationFailure(error: { code: string; hint?: string }): PictureUploadError {
  if (error.code === '54000')
    return new PictureUploadError('too_many', waitMinutesFrom(error.hint));
  return new PictureUploadError(error.code === '' ? 'unreachable' : 'not_allowed');
}

/**
 * Uploads a cover or a profile picture, registers it and asks for its check.
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
  // Step 1: the prepared file, in the story's folder for a cover.
  const path = await storePicture(client, {
    bucket: upload.bucket,
    folder: upload.folder,
    file: upload.file,
    longestSide: longestSideFor[upload.kind],
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_picture', {
    target_bucket: upload.bucket,
    target_path: path,
    picture_kind: upload.kind,
  });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check; a service that is down leaves it pending, tried again later. The stand-in
  // reads the original file name, so it goes with the request.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { path, status };
}

/** What a chapter picture upload needs (S1-E3-09). */
export interface ChapterPictureUpload {
  /** The chapter's row ID, the folder in `chapter-images`. */
  chapterId: string;
  file: File;
}

/**
 * Uploads a picture for a chapter, registers it and asks for its check (S1-E3-09). There is no
 * rights tick box any more (Robert, 2 Nov 2026; bundle ADMIN-2, part e1).
 *
 * @param client - the shared Supabase client
 * @param upload - the chapter and the file
 * @returns the picture's ID (for the text) and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadChapterPicture(
  client: AppSupabaseClient,
  upload: ChapterPictureUpload,
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the chapter's folder.
  const path = await storePicture(client, {
    bucket: 'chapter-images',
    folder: upload.chapterId,
    file: upload.file,
    longestSide: longestSideFor.chapterPicture,
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_chapter_picture', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a picture for the writer's Story Atlas, registers it and asks for its check
 * (S1-E17-11). It shows on the sheet only once the check passed.
 *
 * @param client - the shared Supabase client
 * @param upload - the story's ID (the folder in `atlas-images`) and the file
 * @returns the picture's ID (for set_character_picture()) and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadAtlasPicture(
  client: AppSupabaseClient,
  upload: { storyId: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the story's folder.
  const path = await storePicture(client, {
    bucket: 'atlas-images',
    folder: upload.storyId,
    file: upload.file,
    longestSide: longestSideFor.atlasImage,
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_atlas_picture', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture (CLAUDE.md rule 19).
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a banner picture for a space, registers it and asks for its check (FORUMS-2c;
 * S1-E8-06). The space shows it only once the check passed (CLAUDE.md rule 19).
 *
 * @param client - the shared Supabase client
 * @param upload - the space's ID (the folder in `space-banners`, never a person's ID) and the file
 * @returns the picture's ID (for set_space_banner_picture()) and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadSpaceBanner(
  client: AppSupabaseClient,
  upload: { spaceId: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the space's folder.
  const path = await storePicture(client, {
    bucket: 'space-banners',
    folder: upload.spaceId,
    file: upload.file,
    longestSide: longestSideFor.spaceBanner,
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_space_banner', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a logo for a space, registers it and asks for its check (G8b; S1-E8-06). It sits beside
 * the banner picture in `space-banners`, under the space's folder, and the space shows it only once
 * the check passed (CLAUDE.md rule 19).
 *
 * @param client - the shared Supabase client
 * @param upload - the space's ID (the folder in `space-banners`, never a person's ID) and the file
 * @returns the picture's ID (for set_space_logo_picture()) and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadSpaceLogo(
  client: AppSupabaseClient,
  upload: { spaceId: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the space's folder.
  const path = await storePicture(client, {
    bucket: 'space-banners',
    folder: upload.spaceId,
    file: upload.file,
    longestSide: longestSideFor.spaceLogo,
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_space_logo', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a picture for a landing page's Hero or Text block, registers it and asks for its check
 * (S1-E11-14 criterion 5). A landing page is for every age, so after the check a moderator approves
 * it too; the page can't be published until then (CLAUDE.md rule 19).
 *
 * @param client - the shared Supabase client
 * @param upload - the page's ID (the folder in `landing-pictures`) and the file
 * @returns the picture's ID (kept in the block) and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadLandingPicture(
  client: AppSupabaseClient,
  upload: { pageId: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the page's folder.
  const path = await storePicture(client, {
    bucket: 'landing-pictures',
    folder: upload.pageId,
    file: upload.file,
    longestSide: longestSideFor.landingPicture,
  });
  // Step 2: registered as pending; owner and admin only, and the hourly limit is counted here.
  const registered = await client.rpc('register_landing_picture', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a sponsor campaign's picture, registers it on the campaign and asks for its check
 * (S1-E12-02 criterion 1). Ads reach every age, so after the check a moderator approves it too;
 * the campaign can't be approved until then (CLAUDE.md rule 19).
 *
 * @param client - the shared Supabase client
 * @param upload - the campaign's ID (the folder in `sponsor-creatives`) and the file
 * @returns the picture's ID and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadSponsorCreative(
  client: AppSupabaseClient,
  upload: { campaignId: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the campaign's folder.
  const path = await storePicture(client, {
    bucket: 'sponsor-creatives',
    folder: upload.campaignId,
    file: upload.file,
    longestSide: longestSideFor.sponsorCreative,
  });
  // Step 2: registered as pending and put on the campaign; owner and admin only.
  const registered = await client.rpc('register_sponsor_creative', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a logo or emblem for one brand slot and asks for its check (bundle BRAND-1a). The logo
 * is on every screen for every age, so after the check a moderator approves it too; the app keeps
 * showing the previous picture, or the bundled default, until then (CLAUDE.md rule 19).
 *
 * @param client - the shared Supabase client
 * @param upload - the slot (the folder in `brand-assets`, for example "emblem_dark") and the file
 * @returns the picture's ID (for admin_set_brand_asset()) and its status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadBrandPicture(
  client: AppSupabaseClient,
  upload: { slot: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared file, in the slot's folder. WebP keeps a transparent background.
  const path = await storePicture(client, {
    bucket: 'brand-assets',
    folder: upload.slot,
    file: upload.file,
    longestSide: longestSideFor.brandPicture,
  });
  // Step 2: registered as pending; owner and admin only, and the hourly limit is counted here.
  const registered = await client.rpc('register_brand_picture', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Uploads a forum signature picture, registers it and asks for its check (S1-E8-08). It shows
 * under the person's posts and on their profile only once the check passed (CLAUDE.md rule 19).
 *
 * @param client - the shared Supabase client
 * @param file - the picture the person chose: a still JPEG, PNG or WebP of 1 MB or less
 * @returns the picture's ID (for set_my_signature()) and its status after the check
 * @throws PictureUploadError as uploadPicture(), plus animated for a moving picture
 */
export async function uploadSignaturePicture(
  client: AppSupabaseClient,
  file: File,
): Promise<{ pictureId: string; status: string }> {
  // Step 1: the prepared still file, under a random name (never the user ID, architecture 1.6).
  const path = await storePicture(client, {
    bucket: 'signature-pictures',
    folder: null,
    file,
    longestSide: longestSideFor.signaturePicture,
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_signature_picture', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, file.name);
  return { pictureId: registered.data, status };
}

/**
 * Deletes a file the writer no longer uses (S1-E17-11: "removing it deletes the file"). Storage
 * keeps a file that a moderator or the authorities still need (atlas_images_delete_own).
 *
 * @param client - the shared Supabase client
 * @param file - the bucket and path the database returned, or null when there was none
 * Errors: none thrown; a file that couldn't be deleted is only left behind, never shown again,
 *   because its picture is already marked deleted.
 */
export async function deleteStoredPicture(
  client: AppSupabaseClient,
  file: { bucket: string; path: string } | null,
): Promise<void> {
  if (file === null) return;
  await client.storage.from(file.bucket).remove([file.path]);
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
