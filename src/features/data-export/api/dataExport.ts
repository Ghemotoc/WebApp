/**
 * The database and storage calls of Download my data (story S1-E13-02; ADR 0012) and Download my
 * stories (S1-E13-05), which share the exports table, the bucket and the finishing step.
 *
 * Who calls it: lib/runDataExport.ts and lib/runStoriesExport.ts (making a copy) and the hooks in
 * ../hooks (the Settings panel). What it calls next: request_data_export(),
 * request_stories_export(), my_data_export() and finish_data_export()
 * (supabase/migrations/…_s1_e13_02_download_my_data.sql and …_s1_e13_05_download_my_stories.sql),
 * the exports table (the person's own rows only, policy exports_select_own) and the private
 * exports bucket.
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
  | 'kind'
  | 'story_id'
  | 'chapter_ids'
  | 'include_chapters'
  | 'include_plan'
  | 'include_data'
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

/** What a copy holds: all of the person's data, or their stories as Word files. */
export type DataExportKind = Database['public']['Enums']['export_kind'];

/** The file types the bucket takes: a ZIP, or one Word or JSON file for one story. */
export const ZIP_TYPE = 'application/zip';
export const WORD_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const JSON_TYPE = 'application/json';

/**
 * What the writer chose in Download my stories (Robert, 1 Nov 2026, 06:27 and 06:29): one story
 * or all, one story's chapters or every one, and which files.
 */
export interface StoriesExportChoices {
  /** The story's ID, or null for all the writer's stories. */
  storyId: string | null;
  /** The chosen chapters' IDs, or null for every chapter. */
  chapterIds: string[] | null;
  /** The chapters as a Word file. */
  includeChapters: boolean;
  /** The plan from Story Atlas as a Word file. */
  includePlan: boolean;
  /** The machine-readable copy (JSON). */
  includeData: boolean;
}

/** The parts of a story row the Word files and the EPUB use (the data file keeps every field). */
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
  | 'cover_kind'
  | 'cover_design'
  | 'cover_background'
  | 'cover_accent'
>;

/** The parts of a chapter row the Word files and the EPUB use. */
export type ExportedChapter = Pick<
  Tables<'chapters'>,
  | 'id'
  | 'story_id'
  | 'position'
  | 'draft_title'
  | 'draft_body'
  | 'published_title'
  | 'published_body'
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

/**
 * One story on the reader's library shelves, as export_library_of() answers it (IDEAS-1f). `path`
 * is null when the reader can no longer open the story; `link` is added in the browser
 * (withLibraryLinks() in lib/libraryForExport.ts).
 */
export interface ExportedLibraryEntry {
  shelf: Tables<'library_entries'>['shelf'];
  title: string;
  writer: string;
  path: string | null;
  added_at: string;
  moved_at: string;
  link?: string | null;
}

/** The data file, as my_data_export() answers it; only the parts this screen reads are typed. */
export interface DataExportDocument {
  format: string;
  made_at: string;
  user_id: string;
  account: { profile: Pick<Tables<'profiles'>, 'handle' | 'pen_name'> | null } & Record<
    string,
    unknown
  >;
  /** The library shelves with titles and addresses (IDEAS-1f). */
  library?: ExportedLibraryEntry[];
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

/** What "Get my files" answered: the earlier files, or a new copy to make. */
export type StoriesExportOpened =
  { outcome: 'reused'; exportId: string } | { outcome: 'new'; exportId: string; fileName: string };

/**
 * Opens a Download my stories copy of the writer's choices, or finds the unchanged one with the
 * same choices from the last 24 hours (S1-E13-05).
 *
 * @param choices - the story, the chapters and the files the writer ticked
 * @returns the earlier files, or the new copy's ID and the name to upload under
 * @throws Error with Supabase's message, for example when the story isn't the writer's
 */
export async function requestStoriesExport(
  client: AppSupabaseClient,
  choices: StoriesExportChoices,
): Promise<StoriesExportOpened> {
  const { data, error } = await client.rpc('request_stories_export', {
    chosen_story_id: choices.storyId ?? undefined,
    chosen_chapter_ids: choices.chapterIds ?? undefined,
    include_chapters: choices.includeChapters,
    include_plan: choices.includePlan,
    include_data: choices.includeData,
  });
  if (error !== null) throw new Error(`Could not start the files: ${error.message}`);
  const answer = data as { outcome: 'reused' | 'new'; export_id: string; file_name?: string };
  if (answer.outcome === 'reused') return { outcome: 'reused', exportId: answer.export_id };
  return { outcome: 'new', exportId: answer.export_id, fileName: answer.file_name ?? '' };
}

/**
 * Uploads the finished file under its export's random name: a ZIP, or for one story a single
 * Word file (S1-E13-05).
 *
 * @param fileType - ZIP_TYPE (the default) or WORD_TYPE
 * @throws Error with Storage's message when the upload is refused
 */
export async function uploadExportFile(
  client: AppSupabaseClient,
  fileName: string,
  bytes: Uint8Array,
  fileType: string = ZIP_TYPE,
): Promise<void> {
  const { error } = await client.storage
    .from(EXPORTS_BUCKET)
    .upload(fileName, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: fileType }), {
      contentType: fileType,
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
 * The person's copies of one kind, newest first.
 *
 * @param kind - all_my_data (the default, Download my data) or my_stories (Download my stories)
 * @throws Error with Supabase's message when they can't be read
 */
export async function fetchMyDataExports(
  client: AppSupabaseClient,
  kind: DataExportKind = 'all_my_data',
): Promise<DataExport[]> {
  const { data, error } = await client
    .from('exports')
    .select(
      'id, kind, story_id, chapter_ids, include_chapters, include_plan, include_data, state, file_name, file_size, story_count, created_at, ready_at, expires_at',
    )
    .eq('kind', kind)
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

/** One chapter the writer can tick in Download my stories. */
export interface ChapterChoice {
  id: string;
  position: number;
  title: string;
  isDraft: boolean;
}

/**
 * Reads one of the writer's stories' live chapters, in reading order, for the chapter choice
 * (S1-E13-05; Robert, 1 Nov 2026, 06:27: "download just specific chapters"). The chapters'
 * read policy lets only the writer see their drafts.
 *
 * @param storyId - the story's ID
 * @returns the chapters, first to last
 * @throws Error with Supabase's message when they can't be read
 */
export async function fetchChapterChoices(
  client: AppSupabaseClient,
  storyId: string,
): Promise<ChapterChoice[]> {
  const { data, error } = await client
    .from('chapters')
    .select('id, position, draft_title, first_published_at')
    .eq('story_id', storyId)
    .is('deleted_at', null)
    .order('position');
  if (error !== null) throw new Error(`Could not read the chapters: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    position: row.position,
    title: row.draft_title,
    isDraft: row.first_published_at === null,
  }));
}
