/**
 * A class's certificate crest: the teacher's upload, choice and read, and the signed address a
 * certificate's seal draws the crest from (bundle G13b; the canvas's SpaceCertificates board, "In
 * the seal: Our school's crest").
 *
 * Who calls it: hooks/useCertificateCrest.ts. What it calls next: svgToPng(), storePicture(),
 * requestPictureCheck(), deleteStoredPicture() and pictureViewOf() in the pictures feature,
 * register_certificate_crest(),
 * set_class_certificate_crest() and class_certificate_crest() in
 * supabase/migrations/…_g13b_certificate_crest.sql. The database decides who may change it (the
 * class's own teacher) and when anyone else may see it (once its check passed; CLAUDE.md rule 19).
 */
import {
  deleteStoredPicture,
  pictureFromJson,
  PictureUploadError,
  pictureViewOf,
  registrationFailure,
  requestPictureCheck,
  storePicture,
  type PictureView,
  type StoredPicture,
} from '@/features/pictures/api/pictures';
import { longestSideFor } from '@/features/pictures/lib/preparePicture';
import { SvgDrawingError, svgToPng, svgType } from '@/features/pictures/lib/svgToPng';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { certificateErrorFrom } from './certificates';

/**
 * Reads the replaced crest's file from set_class_certificate_crest()'s answer.
 *
 * @param data - {"old_file": {bucket, path} or null}
 * @returns the file, or null when there was none or a certificate still shows it
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

/** The largest crest a teacher may choose, before it is redrawn (board SpaceCertificates: 2 MB). */
const largestCrestBytes = 2 * 1024 * 1024;

/**
 * Turns the crest the teacher chose into a picture storePicture() takes: an SVG is redrawn as a
 * PNG (../lib/svgToPng.ts), anything else goes as it is.
 *
 * @param file - the chosen file
 * @returns the file to store
 * @throws PictureUploadError too_big over 2 MB, wrong_type for an SVG that can't be drawn
 */
async function crestPictureFile(file: File): Promise<File> {
  if (file.size > largestCrestBytes) throw new PictureUploadError('too_big');
  if (file.type !== svgType) return file;
  return svgToPng(file).catch((error: unknown) => {
    throw error instanceof SvgDrawingError ? new PictureUploadError('wrong_type') : error;
  });
}

/**
 * Uploads a school's crest for a class's certificates, registers it and asks for its check, like
 * every other picture (bundle G13b; CLAUDE.md rule 19). Only the class's own teacher may register
 * one; the database checks that.
 *
 * @param client - the shared Supabase client
 * @param upload - the class's ID (its folder in `space-banners`) and the file: PNG, JPEG, WebP or
 *   SVG, up to 2 MB
 * @returns the picture's ID (for set_class_certificate_crest()) and its status after the check
 * @throws PictureUploadError as storePicture(), or too_big over 2 MB
 */
async function uploadCertificateCrest(
  client: AppSupabaseClient,
  upload: { spaceId: string; file: File },
): Promise<{ pictureId: string; status: string }> {
  // Step 1: an SVG becomes pixels only, then the prepared file goes in the class's folder.
  const file = await crestPictureFile(upload.file);
  const path = await storePicture(client, {
    bucket: 'space-banners',
    folder: upload.spaceId,
    file,
    longestSide: longestSideFor.spaceLogo,
  });
  // Step 2: registered as pending; the class's teacher only, and the hourly limit is counted here.
  const registered = await client.rpc('register_certificate_crest', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  const status = await requestPictureCheck(client, registered.data, upload.file.name);
  return { pictureId: registered.data, status };
}

/**
 * Makes a crest the class's crest, or (with null) takes it off, then deletes the replaced crest's
 * file when no signed certificate shows it.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @param pictureId - a crest the teacher registered for this class, or null
 * @throws CertificateError when refused (not the class's teacher, not the teacher's crest)
 */
export async function setClassCertificateCrest(
  client: AppSupabaseClient,
  slug: string,
  pictureId: string | null,
): Promise<void> {
  const { data, error } = await client.rpc('set_class_certificate_crest', {
    slug,
    picture_id: pictureId ?? undefined,
  });
  if (error) throw certificateErrorFrom(error);
  await deleteStoredPicture(client, oldFileFrom(data));
}

/**
 * Uploads a crest, has it checked and makes it the class's crest. It shows in the seal only once
 * its check passed; until then the cat shows.
 *
 * @param client - the Supabase client
 * @param target - the class's address and ID, and the file the teacher chose
 * @returns the picture's check status ("passed", "held", "pending"…)
 * @throws PictureUploadError for the file or the upload, CertificateError for the change
 */
export async function uploadAndSetClassCertificateCrest(
  client: AppSupabaseClient,
  target: { slug: string; spaceId: string; file: File },
): Promise<string> {
  const uploaded = await uploadCertificateCrest(client, {
    spaceId: target.spaceId,
    file: target.file,
  });
  await setClassCertificateCrest(client, target.slug, uploaded.pictureId);
  return uploaded.status;
}

/**
 * The class's crest as the teacher's page draws it.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @returns its state and a signed address, or null when the class has no crest
 * @throws CertificateError when refused
 */
export async function fetchClassCertificateCrest(
  client: AppSupabaseClient,
  slug: string,
): Promise<PictureView | null> {
  const { data, error } = await client.rpc('class_certificate_crest', { slug });
  if (error) throw certificateErrorFrom(error);
  return pictureViewOf(client, pictureFromJson(data));
}

/**
 * A signed certificate's crest, for its seal.
 *
 * @param client - the Supabase client
 * @param crest - the crest my_certificates() returned, or null
 * @returns its signed address, or null when there is none the caller may see
 */
export async function certificateCrestAddress(
  client: AppSupabaseClient,
  crest: StoredPicture | null,
): Promise<string | null> {
  if (crest?.state !== 'visible') return null;
  const view = await pictureViewOf(client, crest);
  return view?.url ?? null;
}
