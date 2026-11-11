/**
 * A space's banner picture: choosing an uploaded picture or going back to the drawn colour, and
 * the signed address the header draws it from (bundle FORUMS-2, part c; story S1-E8-06
 * criterion 1: "an optional banner").
 *
 * Who calls it: hooks/useSpaceBanner.ts. What it calls next: uploadSpaceBanner(),
 * deleteStoredPicture() and pictureViewOf() in the pictures feature, and
 * set_space_banner_picture() in supabase/migrations/…_forums2_c_space_banners_and_notifications.sql.
 * The database decides who may change it (the settings power) and when anyone else may see it
 * (once its check passed; CLAUDE.md rule 19).
 */
import { pictureViewOf, type PictureView } from '@/features/pictures/api/pictures';
import { deleteStoredPicture, uploadSpaceBanner } from '@/features/pictures/api/pictureUploads';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { spaceErrorFrom, type Space } from './spaces';

/**
 * Reads the replaced picture's file from set_space_banner_picture()'s answer.
 *
 * @param data - {"old_file": {bucket, path} or null}
 * @returns the file, or null when there was none
 */
function oldFileFrom(data: Json): { bucket: string; path: string } | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const file = data['old_file'];
  if (file === null || file === undefined || typeof file !== 'object' || Array.isArray(file))
    return null;
  const { bucket, path } = file;
  if (typeof bucket !== 'string' || typeof path !== 'string') return null;
  return { bucket, path };
}

/**
 * Makes a picture the space's banner, or (with null) goes back to the drawn colour, then deletes
 * the replaced picture's file. Storage keeps a file moderators or the authorities still need.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param pictureId - a banner the caller registered for this space, or null
 * @throws SpaceError when refused (no settings power, not the caller's picture)
 */
export async function setSpaceBannerPicture(
  client: AppSupabaseClient,
  slug: string,
  pictureId: string | null,
): Promise<void> {
  const { data, error } = await client.rpc('set_space_banner_picture', {
    slug,
    picture_id: pictureId ?? undefined,
  });
  if (error) throw spaceErrorFrom(error);
  await deleteStoredPicture(client, oldFileFrom(data));
}

/**
 * Uploads a banner, has it checked and makes it the space's banner. It shows to others only once
 * its check passed; until then the drawn colour shows.
 *
 * @param client - the Supabase client
 * @param space - the space
 * @param file - the picture the person chose
 * @returns the picture's check status ("passed", "held", "pending"…)
 * @throws PictureUploadError for the file or the upload, SpaceError for the change
 */
export async function uploadAndSetSpaceBanner(
  client: AppSupabaseClient,
  space: Space,
  file: File,
): Promise<string> {
  const uploaded = await uploadSpaceBanner(client, { spaceId: space.id, file });
  await setSpaceBannerPicture(client, space.slug, uploaded.pictureId);
  return uploaded.status;
}

/**
 * The banner picture as the header draws it.
 *
 * @param client - the Supabase client
 * @param space - the space
 * @returns its state and a signed address, or null when the space uses its drawn colour
 */
export async function fetchSpaceBannerView(
  client: AppSupabaseClient,
  space: Space,
): Promise<PictureView | null> {
  return pictureViewOf(client, space.bannerPicture);
}
