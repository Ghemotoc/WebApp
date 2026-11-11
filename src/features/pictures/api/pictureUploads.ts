/**
 * Uploading pictures: checking a chosen file, preparing it (lib/preparePicture.ts: location data
 * removed, resized), putting it in its bucket, registering it and asking for its check, for covers,
 * profile pictures, chapter pictures, Story Atlas pictures, space banners and logos, signature
 * pictures, landing page pictures, sponsor creatives and brand pictures (stories S1-E10-05,
 * S1-E3-09, S1-E17-11, S1-E8-06 and S1-E8-08; CLAUDE.md rule 19: every uploaded picture is checked
 * before anyone else sees it).
 *
 * Why it is its own file (CI-3, 11 Nov 2026): reading a picture (./pictures.ts) is needed on every
 * page, uploading only on the screens with an upload field. Kept apart, the upload code stays out
 * of the script every page loads, which keeps the chapter reader under its 1,300 KB budget
 * (e2e/reader-performance.spec.ts).
 *
 * Who calls it: the upload hooks in ../hooks, and the upload fields of Story settings, the chapter
 * editor, the Story Atlas, spaces, forum signatures, landing pages, sponsors, branding, Canva,
 * certificates and quote cards.
 * What it calls next: Supabase Storage (the private buckets), the database functions
 * register_picture(), register_chapter_picture(), register_atlas_picture(), register_space_banner(),
 * register_space_logo(), register_signature_picture() and the others named below, and
 * requestPictureCheck() in ./pictures.ts, which asks POST /api/picture-check for the check.
 */
import { isAnimatedPicture } from '@/lib/animated-picture';
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  endingForPreparedType,
  longestSideFor,
  PicturePreparationError,
  preparePicture,
} from '../lib/preparePicture';
import { requestPictureCheck, type PictureBucket } from './pictures';

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
