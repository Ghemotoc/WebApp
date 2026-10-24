/**
 * Reads, makes and saves the signed-in writer's chapters (story S1-E3-02a).
 *
 * Who calls it: the hooks in src/features/writing/hooks/ (useChapterDraft, useAutosave) and
 * useNewStoryForm (chapter one right after the story).
 * What it calls next: Supabase.
 * - Reading a chapter for the editor: the chapters table through chapters_select_own (a writer
 *   reads only their own rows), with the story it belongs to.
 * - Making a chapter: create_chapter(story_slug) → {outcome: ok, code, position} | not_active
 *   | not_found.
 * - Saving the draft: save_chapter_draft(code, title, body, expected_version) → {status: saved,
 *   version, saved_at, word_count} | conflict | not_active | not_found.
 * Readers never read these rows: they go through get_chapter() (S1-E4-01a, ADR 0004).
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { ChapterDraftInput } from '@/schemas/chapter';

/** A chapter's status as stored. */
export type ChapterStatus = Database['public']['Enums']['chapter_status'];

/** One of the writer's own chapters, as the editor loads it. */
export interface MyChapter {
  id: string;
  code: string;
  position: number;
  draftTitle: string;
  draftBody: string;
  draftVersion: number;
  draftSavedAt: string | null;
  status: ChapterStatus;
  wordCount: number;
  story: { slug: string; title: string };
}

/** What create_chapter() answers. */
export type CreateChapterResult =
  | { outcome: 'ok'; code: string; position: number }
  | { outcome: 'not_active' }
  | { outcome: 'not_found' };

/** What save_chapter_draft() answers. */
export type SaveDraftResult =
  | { status: 'saved'; version: number; savedAt: string; wordCount: number }
  | { status: 'conflict'; version: number; savedAt: string | null }
  | { status: 'not_active' }
  | { status: 'not_found' };

/**
 * Reads one of the writer's own chapters by its code.
 *
 * @param client - the shared Supabase client
 * @param code - the chapter's 8-character address part
 * @returns the chapter with its story, or null when the writer has no live chapter at that code
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyChapter(
  client: AppSupabaseClient,
  code: string,
): Promise<MyChapter | null> {
  const { data, error } = await client
    .from('chapters')
    .select(
      'id, code, position, draft_title, draft_body, draft_version, draft_saved_at, status, word_count, stories!inner(slug, title)',
    )
    .eq('code', code)
    .is('deleted_at', null)
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read the chapter: ${error.message}`);
  if (data === null) return null;
  return {
    id: data.id,
    code: data.code,
    position: data.position,
    draftTitle: data.draft_title,
    draftBody: data.draft_body,
    draftVersion: data.draft_version,
    draftSavedAt: data.draft_saved_at,
    status: data.status,
    wordCount: data.word_count,
    story: { slug: data.stories.slug, title: data.stories.title },
  };
}

/**
 * Adds an empty chapter at the end of the writer's own story.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @returns the new chapter's code and number, or why it couldn't be made
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function createChapter(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<CreateChapterResult> {
  const { data, error } = await client.rpc('create_chapter', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not add the chapter: ${error.message}`);
  const answer = data as { outcome?: string; code?: string; position?: number } | null;
  if (
    answer?.outcome === 'ok' &&
    typeof answer.code === 'string' &&
    typeof answer.position === 'number'
  ) {
    return { outcome: 'ok', code: answer.code, position: answer.position };
  }
  if (answer?.outcome === 'not_active' || answer?.outcome === 'not_found') {
    return { outcome: answer.outcome };
  }
  throw new Error(`Unexpected answer from create_chapter: ${JSON.stringify(answer)}`);
}

/**
 * Saves the draft of the writer's own chapter (the autosave).
 *
 * @param client - the shared Supabase client
 * @param code - the chapter's code
 * @param draft - the checked title, body and the version the editor started from
 * @returns saved (with the new version and time), conflict (another device saved first),
 *   not_active or not_found
 * Errors: throws when the database refuses the text (a mistake the schema should have caught)
 *   or can't be reached.
 */
export async function saveChapterDraft(
  client: AppSupabaseClient,
  code: string,
  draft: ChapterDraftInput,
): Promise<SaveDraftResult> {
  const { data, error } = await client.rpc('save_chapter_draft', {
    chapter_code: code,
    title: draft.title,
    body: draft.body,
    expected_version: draft.expectedVersion,
  });
  if (error !== null) throw new Error(`Could not save the chapter: ${error.message}`);
  return toSaveDraftResult(data);
}

/** The JSON shape save_chapter_draft() answers. */
interface SaveDraftAnswer {
  status?: string;
  version?: number;
  saved_at?: string | null;
  word_count?: number;
}

/** The error for an answer the editor doesn't know. */
function unexpectedAnswer(answer: unknown): Error {
  return new Error(`Unexpected answer from save_chapter_draft: ${JSON.stringify(answer)}`);
}

/** A "saved" answer: the new version, the time and the word count. */
function savedResult(answer: SaveDraftAnswer): SaveDraftResult {
  if (typeof answer.version !== 'number' || typeof answer.saved_at !== 'string') {
    throw unexpectedAnswer(answer);
  }
  return {
    status: 'saved',
    version: answer.version,
    savedAt: answer.saved_at,
    wordCount: answer.word_count ?? 0,
  };
}

/** A "conflict" answer: the version the server has, and when it was saved. */
function conflictResult(answer: SaveDraftAnswer): SaveDraftResult {
  if (typeof answer.version !== 'number') throw unexpectedAnswer(answer);
  return { status: 'conflict', version: answer.version, savedAt: answer.saved_at ?? null };
}

/**
 * Reads the function's JSON answer into the four shapes the editor knows.
 *
 * @param data - the function's answer
 * @returns the result
 * Errors: throws on anything else.
 */
function toSaveDraftResult(data: unknown): SaveDraftResult {
  const answer = (data ?? {}) as SaveDraftAnswer;
  switch (answer.status) {
    case 'saved':
      return savedResult(answer);
    case 'conflict':
      return conflictResult(answer);
    case 'not_active':
    case 'not_found':
      return { status: answer.status };
    default:
      throw unexpectedAnswer(answer);
  }
}
