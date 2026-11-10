/**
 * Reads and changes the chapters of one of the writer's stories for "Manage chapters"
 * (story S1-E3-04; board 4.4). GAPS-11 adds the note beside a chapter whose number changed
 * ("Was chapter 13").
 *
 * Who calls it: hooks/useManageChapters.ts.
 * What it calls next: Supabase.
 * - The list: the chapters table through chapters_select_own (a writer reads only their own
 *   rows), live and deleted, for one story; never another writer's.
 * - The notes: chapter_move_notes(slug), the chapters whose number changed in the last 7 days
 *   and the number each had before (supabase/migrations/…_gaps11_chapter_moves.sql).
 * - The changes: move_chapter(code, direction), set_chapter_order(slug, codes, moved code),
 *   rename_chapter(code, title), delete_chapter(code), restore_chapter(code)
 *   (supabase/migrations/…_s1_e3_04_manage_chapters.sql), and publish_chapter /
 *   unpublish_chapter from S1-E3-03; each answers {outcome: ok | …}.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ChapterStatus } from './chapters';

/** How a chapter shows on the list: the board's four pills (Published, Draft, Scheduled, Unpublished). */
export type ManagedChapterState = 'published' | 'draft' | 'scheduled' | 'unpublished';

/** One chapter as Manage chapters lists it. */
export interface ManagedChapter {
  code: string;
  position: number;
  title: string;
  state: ManagedChapterState;
  wordCount: number;
  draftSavedAt: string | null;
  firstPublishedAt: string | null;
  editedAt: string | null;
  scheduledFor: string | null;
  unpublishedAt: string | null;
  /** When the writer deleted it; null for a live chapter. */
  deletedAt: string | null;
  /**
   * The number it had before its first move in the last 7 days; null when it didn't move or is
   * back where it was (GAPS-11).
   */
  wasPosition: number | null;
  /** True when the writer moved this chapter; false when it only shifted to make room. */
  wasPicked: boolean;
}

/** One chapter's move note as chapter_move_notes() answers it. */
interface ChapterMoveNote {
  wasPosition: number;
  wasPicked: boolean;
}

/**
 * Reads which chapters of one of the writer's stories recently changed number.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @returns the notes by chapter code; empty when nothing moved in the last 7 days
 * Errors: throws with Supabase's message when the database can't be reached.
 */
async function fetchMoveNotes(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<Map<string, ChapterMoveNote>> {
  const { data, error } = await client.rpc('chapter_move_notes', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read the chapter moves: ${error.message}`);
  return new Map(
    data.map((row) => [
      row.chapter_code,
      { wasPosition: row.was_position, wasPicked: row.was_picked },
    ]),
  );
}

/** What the changing functions answer. */
export type ManageOutcome =
  'ok' | 'not_active' | 'not_found' | 'at_edge' | 'wrong_list' | 'empty' | 'wrong_state';

/** The database's status plus whether it was unpublished, as the board's pill. */
function stateOf(status: ChapterStatus, unpublishedAt: string | null): ManagedChapterState {
  if (status === 'draft' && unpublishedAt !== null) return 'unpublished';
  return status;
}

/**
 * Reads every chapter of one of the writer's stories, deleted ones included (for undo), each
 * with its move note.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @returns the chapters, live ones in reading order first
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryChapters(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<ManagedChapter[]> {
  const { data, error } = await client
    .from('chapters')
    .select(
      'code, position, draft_title, status, word_count, draft_saved_at, first_published_at, edited_at, scheduled_for, unpublished_at, deleted_at, stories!inner(slug)',
    )
    .eq('stories.slug', storySlug)
    .order('position');
  if (error !== null) throw new Error(`Could not read the chapters: ${error.message}`);
  // The notes come from their own function, which works out the earlier number per chapter.
  const notes = await fetchMoveNotes(client, storySlug);
  return data.map((row) => ({
    code: row.code,
    position: row.position,
    title: row.draft_title,
    state: stateOf(row.status, row.unpublished_at),
    wordCount: row.word_count,
    draftSavedAt: row.draft_saved_at,
    firstPublishedAt: row.first_published_at,
    editedAt: row.edited_at,
    scheduledFor: row.scheduled_for,
    unpublishedAt: row.unpublished_at,
    deletedAt: row.deleted_at,
    wasPosition: notes.get(row.code)?.wasPosition ?? null,
    wasPicked: notes.get(row.code)?.wasPicked ?? false,
  }));
}

/** The outcomes the screen knows. */
const knownOutcomes: readonly string[] = [
  'ok',
  'not_active',
  'not_found',
  'at_edge',
  'wrong_list',
  'empty',
  'wrong_state',
];

/**
 * Calls one of the changing functions and reads its answer.
 *
 * @param client - the shared Supabase client
 * @param name - the function
 * @param args - its arguments
 * @returns the outcome
 * Errors: throws when the database refuses the call (for example a title that is too long) or
 *   can't be reached, or answers something unexpected.
 */
export async function changeChapters(
  client: AppSupabaseClient,
  name:
    | 'move_chapter'
    | 'set_chapter_order'
    | 'rename_chapter'
    | 'delete_chapter'
    | 'restore_chapter'
    | 'publish_chapter'
    | 'unpublish_chapter',
  args: Record<string, unknown>,
): Promise<ManageOutcome> {
  // The functions' argument names are checked by their own SQL; the screen passes them as named.
  const { data, error } = await client.rpc(
    name as 'move_chapter',
    args as { chapter_code: string; direction: number },
  );
  if (error !== null) throw new Error(`Could not change the chapters: ${error.message}`);
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome !== undefined && knownOutcomes.includes(outcome)) return outcome as ManageOutcome;
  throw new Error(`Unexpected answer from ${name}: ${JSON.stringify(data)}`);
}
