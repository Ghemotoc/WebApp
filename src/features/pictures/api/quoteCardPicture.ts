/**
 * A reader's own background picture for quote cards: uploading it, reading where it stands and
 * taking it away (bundle GAPS-7, part c; board 3.6 Share: "+ Your own picture").
 *
 * It lives beside pictures.ts (which holds the shared steps: prepare and store the file, register
 * it, ask for its check) so that file stays readable.
 * Who calls it: useQuoteCardPicture (features/sharing/hooks).
 * What it calls next: Supabase Storage (the private `quote-card-pictures` bucket), the database
 * functions register_quote_card_picture(), my_quote_card_picture() and
 * remove_my_quote_card_picture() (…_gaps7_quote_card_backgrounds.sql), and the picture check
 * through requestPictureCheck().
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { longestSideFor } from '../lib/preparePicture';

import { pictureFromJson, requestPictureCheck, type StoredPicture } from './pictures';
import { deleteStoredPicture, registrationFailure, storePicture } from './pictureUploads';

/**
 * Uploads the reader's own background picture for quote cards, registers it and asks for its
 * check (GAPS-7; board 3.6 Share: "Your own picture goes through our image check first"). Only
 * the reader and picture reviewers can ever read the file; the card may use it once the check
 * passed (CLAUDE.md rule 19). Registering retires the picture they had before.
 *
 * @param client - the shared Supabase client
 * @param file - the picture the reader chose: a JPEG, PNG or WebP of 5 MB or less
 * @returns the picture's status after the check
 * @throws PictureUploadError as uploadPicture()
 */
export async function uploadQuoteCardPicture(
  client: AppSupabaseClient,
  file: File,
): Promise<{ status: string }> {
  // Step 1: the prepared file, under a random name (never the user ID, architecture 1.6).
  const path = await storePicture(client, {
    bucket: 'quote-card-pictures',
    folder: null,
    file,
    longestSide: longestSideFor.quoteCardPicture,
  });
  // Step 2: registered as pending; the hourly limit is counted here.
  const registered = await client.rpc('register_quote_card_picture', { target_path: path });
  if (registered.error !== null) throw registrationFailure(registered.error);
  // Step 3: the check, as for every other picture.
  return { status: await requestPictureCheck(client, registered.data, file.name) };
}

/**
 * Reads the reader's own quote card background (GAPS-7).
 *
 * @param client - the shared Supabase client
 * @returns the stored picture (its state and file), or null when they have none
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyQuoteCardPicture(
  client: AppSupabaseClient,
): Promise<StoredPicture | null> {
  const { data, error } = await client.rpc('my_quote_card_picture');
  if (error !== null) throw new Error(`Could not read your picture: ${error.message}`);
  return pictureFromJson(data);
}

/**
 * Takes the reader's own quote card background away and deletes its file (GAPS-7). Storage keeps
 * a file the moderators still need (quote_card_pictures_delete_own).
 *
 * @param client - the shared Supabase client
 * Errors: throws when the database refuses or can't be reached.
 */
export async function removeMyQuoteCardPicture(client: AppSupabaseClient): Promise<void> {
  const { data, error } = await client.rpc('remove_my_quote_card_picture');
  if (error !== null) throw new Error(`Could not remove your picture: ${error.message}`);
  const answer = data as { old_file?: { bucket: string; path: string } | null } | null;
  await deleteStoredPicture(client, answer?.old_file ?? null);
}
