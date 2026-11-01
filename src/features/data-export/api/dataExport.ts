/**
 * The database and storage calls of Download my data (story S1-E13-02; ADR 0012).
 *
 * Who calls it: lib/runDataExport.ts (making a copy) and the hooks in ../hooks (the Settings
 * panel). What it calls next: request_data_export(), my_data_export() and finish_data_export()
 * (supabase/migrations/…_s1_e13_02_download_my_data.sql), the exports table (the person's own
 * rows only, policy exports_select_own) and the private exports bucket.
 */
import type { Database, Tables } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The bucket the ZIPs live in. */
export const EXPORTS_BUCKET = 'exports';

/** A download address lasts one minute: long enough to start the download, too short to share. */
const downloadAddressSeconds = 60;

/** One of the person's copies, as Settings shows it. */
export type DataExport = Pick<
  Tables<'exports'>,
  | 'id'
  | 'state'
  | 'file_name'
  | 'file_size'
  | 'story_count'
  | 'created_at'
  | 'ready_at'
  | 'expires_at'
>;

/** The export state, from the database's enum. */
export type DataExportState = Database['public']['Enums']['export_state'];

/** The parts of a story row the Word files use (the data file keeps every field). */
export type ExportedStory = Pick<
  Tables<'stories'>,
  | 'id'
  | 'slug'
  | 'title'
  | 'language_code'
  | 'completion_status'
  | 'created_at'
  | 'first_published_at'
  | 'updated_at'
  | 'deleted_at'
>;

/** The parts of a chapter row the Word files use. */
export type ExportedChapter = Pick<
  Tables<'chapters'>,
  | 'id'
  | 'story_id'
  | 'position'
  | 'draft_title'
  | 'draft_body'
  | 'published_title'
  | 'status'
  | 'created_at'
  | 'first_published_at'
  | 'last_published_at'
  | 'deleted_at'
>;

/** The parts of a music or video card the Word files use. */
export type ExportedEmbed = Pick<Tables<'chapter_embeds'>, 'id' | 'title' | 'source_url'>;

/** The parts of a picture row the Word files use. */
export type ExportedPicture = Pick<Tables<'picture_checks'>, 'id' | 'bucket' | 'path' | 'status'>;

/** The data file, as my_data_export() answers it; only the parts this screen reads are typed. */
export interface DataExportDocument {
  format: string;
  made_at: string;
  user_id: string;
  account: { profile: Pick<Tables<'profiles'>, 'handle' | 'pen_name'> | null } & Record<
    string,
    unknown
  >;
  tables: {
    stories?: ExportedStory[];
    chapters?: ExportedChapter[];
    chapter_embeds?: ExportedEmbed[];
    picture_checks?: ExportedPicture[];
  } & Record<string, unknown>;
}

/**
 * Opens a new copy for the signed-in person.
 *
 * @returns the export's ID and the random name to upload its ZIP under
 * @throws Error with Supabase's message (signed out, or too many requests in an hour)
 */
export async function requestDataExport(
  client: AppSupabaseClient,
): Promise<{ exportId: string; fileName: string }> {
  const { data, error } = await client.rpc('request_data_export');
  if (error !== null) throw new Error(`Could not start the copy: ${error.message}`);
  const answer = data as { export_id: string; file_name: string };
  return { exportId: answer.export_id, fileName: answer.file_name };
}

/**
 * Reads everything about the signed-in account, as the data file.
 *
 * @throws Error with Supabase's message when it can't be read
 */
export async function fetchDataExportDocument(
  client: AppSupabaseClient,
): Promise<DataExportDocument> {
  const { data, error } = await client.rpc('my_data_export');
  if (error !== null) throw new Error(`Could not read the account's data: ${error.message}`);
  return data as unknown as DataExportDocument;
}

/**
 * Uploads the finished ZIP under its export's random name.
 *
 * @throws Error with Storage's message when the upload is refused
 */
export async function uploadExportFile(
  client: AppSupabaseClient,
  fileName: string,
  zip: Uint8Array,
): Promise<void> {
  const { error } = await client.storage
    .from(EXPORTS_BUCKET)
    .upload(fileName, new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), {
      contentType: 'application/zip',
      upsert: false,
    });
  if (error !== null) throw new Error(`Could not save the copy: ${error.message}`);
}

/**
 * Deletes older copies' files, so only one copy of the person's data is kept. A failure is only
 * warned about: the nightly clean-up (S1-E13-04) removes what is left.
 *
 * @param fileNames - the older copies' file names
 */
export async function deleteExportFiles(
  client: AppSupabaseClient,
  fileNames: string[],
): Promise<void> {
  if (fileNames.length === 0) return;
  const { error } = await client.storage.from(EXPORTS_BUCKET).remove(fileNames);
  if (error !== null) console.warn(`Could not delete an older copy: ${error.message}`);
}

/**
 * Marks the uploaded copy ready for seven days and sends the notification.
 *
 * @param storyCount - how many Word files the ZIP holds
 * @throws Error with Supabase's message (the file didn't arrive, or the export isn't open)
 */
export async function finishDataExport(
  client: AppSupabaseClient,
  exportId: string,
  storyCount: number,
): Promise<void> {
  const { error } = await client.rpc('finish_data_export', {
    export_id: exportId,
    story_count: storyCount,
  });
  if (error !== null) throw new Error(`Could not finish the copy: ${error.message}`);
}

/**
 * The person's copies, newest first.
 *
 * @throws Error with Supabase's message when they can't be read
 */
export async function fetchMyDataExports(client: AppSupabaseClient): Promise<DataExport[]> {
  const { data, error } = await client
    .from('exports')
    .select('id, state, file_name, file_size, story_count, created_at, ready_at, expires_at')
    .order('created_at', { ascending: false });
  if (error !== null) throw new Error(`Could not read your copies: ${error.message}`);
  return data;
}

/**
 * A one-minute download address for a ready copy. Storage gives it only to the signed-in owner
 * while the copy is ready and unexpired (policy exports_select_own on the files).
 *
 * @param downloadName - the name the browser saves the file under
 * @throws Error with Storage's message when it is refused (expired, or signed out)
 */
export async function exportDownloadAddress(
  client: AppSupabaseClient,
  fileName: string,
  downloadName: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(fileName, downloadAddressSeconds, { download: downloadName });
  if (error !== null) throw new Error(`Could not open the copy: ${error.message}`);
  return data.signedUrl;
}

/**
 * One of the person's chapter pictures, for its Word file.
 *
 * @returns the file, or null when Storage refuses it (a removed picture, say)
 */
export async function downloadPicture(
  client: AppSupabaseClient,
  picture: ExportedPicture,
): Promise<Blob | null> {
  const { data, error } = await client.storage.from(picture.bucket).download(picture.path);
  return error === null ? data : null;
}
