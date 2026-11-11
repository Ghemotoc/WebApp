/**
 * A space's logo: choosing an uploaded picture or taking the logo off, and the signed address the
 * header and the space cards draw it from (bundle G8b of the liquid glass redesign; story S1-E8-06;
 * boards Space, Spaces and SpaceSettings: "Logo (optional)").
 *
 * Who calls it: hooks/useSpaceLogo.ts. What it calls next: uploadSpaceLogo(),
 * deleteStoredPicture() and pictureViewOf() in the pictures feature, and set_space_logo_picture()
 * in supabase/migrations/…_g8b_space_logo_and_banners.sql. The database decides who may change it
 * (the settings power) and when anyone else may see it (once its check passed; CLAUDE.md rule 19).
 */
import { pictureViewOf, type PictureView } from '@/features/pictures/api/pictures';
import { deleteStoredPicture, uploadSpaceLogo } from '@/features/pictures/api/pictureUploads';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { spaceErrorFrom, type Space } from './spaces';

/**
 * Reads the replaced logo's file from set_space_logo_picture()'s answer.
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
 * Makes a picture the space's logo, or (with null) takes the logo off, then deletes the replaced
 * logo's file. Storage keeps a file moderators or the authorities still need.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param pictureId - a logo the caller registered for this space, or null
 * @throws SpaceError when refused (no settings power, not the caller's logo)
 */
export async function setSpaceLogoPicture(
  client: AppSupabaseClient,
  slug: string,
  pictureId: string | null,
): Promise<void> {
  const { data, error } = await client.rpc('set_space_logo_picture', {
    slug,
    picture_id: pictureId ?? undefined,
  });
  if (error) throw spaceErrorFrom(error);
  await deleteStoredPicture(client, oldFileFrom(data));
}

/**
 * Uploads a logo, has it checked and makes it the space's logo. It shows to others only once its
 * check passed; until then the space shows no logo.
 *
 * @param client - the Supabase client
 * @param space - the space
 * @param file - the picture the person chose
 * @returns the picture's check status ("passed", "held", "pending"…)
 * @throws PictureUploadError for the file or the upload, SpaceError for the change
 */
export async function uploadAndSetSpaceLogo(
  client: AppSupabaseClient,
  space: Space,
  file: File,
): Promise<string> {
  const uploaded = await uploadSpaceLogo(client, { spaceId: space.id, file });
  await setSpaceLogoPicture(client, space.slug, uploaded.pictureId);
  return uploaded.status;
}

/**
 * The logo as the header and the cards draw it.
 *
 * @param client - the Supabase client
 * @param space - the space
 * @returns its state and a signed address, or null when the space has no logo
 */
export async function fetchSpaceLogoView(
  client: AppSupabaseClient,
  space: Space,
): Promise<PictureView | null> {
  return pictureViewOf(client, space.logoPicture);
}
