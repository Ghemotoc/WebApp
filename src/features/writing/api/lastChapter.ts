/**
 * The last-chapter mark from the writer's side (bundle CALM-6; design handover "The last
 * chapter", points 10 to 13; Robert's decision card "A switch when publishing", 20 Nov 2026).
 *
 * Who calls it: useChapterPublishing (the Publish panel).
 * What it calls next: Supabase.
 * - publish_chapter(chapter_code, as_last, tell_followers): puts the chapter out now, as the last
 *   when as_last (the story turns Completed), telling followers unless tell_followers is false
 *   (board D06).
 * - set_chapter_last(chapter_code, is_last): the switch on a scheduled chapter (on or off) or on
 *   the latest published one (on only).
 * - my_chapter_last_state(chapter_code): what the panel shows about the mark.
 * Scheduling with the mark is scheduleChapter(…, { asLast }) in chapters.ts.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { toActionOutcome, type ChapterActionOutcome } from './chapters';

/** What the Publish panel knows about the mark for one chapter. */
export interface ChapterLastState {
  /** The number readers will see on this chapter ("Publish chapter 15"). */
  number: number;
  /** This chapter holds the mark. */
  isLast: boolean;
  /** The switch may be turned on now: nothing is out or scheduled after this chapter. */
  canMark: boolean;
  /** An earlier chapter's number when it holds the mark, else null. */
  markedNumber: number | null;
  /** In a later language edition: the chapter it translates holds the mark. */
  originalIsLast: boolean;
}

/** The database's JSON for the state. */
interface ChapterLastStateRow {
  number: number;
  is_last: boolean;
  can_mark: boolean;
  marked_number: number | null;
  original_is_last: boolean;
}

/**
 * Reads what the Publish panel shows about the mark.
 *
 * @param client - the shared Supabase client
 * @param code - the chapter's code
 * @returns the state, or null when the writer has no live chapter at that code
 * Errors: throws when the database can't be reached.
 */
export async function fetchChapterLastState(
  client: AppSupabaseClient,
  code: string,
): Promise<ChapterLastState | null> {
  const { data, error } = await client.rpc('my_chapter_last_state', { chapter_code: code });
  if (error !== null) throw new Error(`Could not read the last-chapter mark: ${error.message}`);
  const row = data as ChapterLastStateRow | null;
  if (row === null) return null;
  return {
    number: row.number,
    isLast: row.is_last,
    canMark: row.can_mark,
    markedNumber: row.marked_number,
    originalIsLast: row.original_is_last,
  };
}

/**
 * Puts the writer's own chapter out now, optionally as the story's last.
 *
 * @param client - the shared Supabase client
 * @param code - the chapter's code
 * @param asLast - true when "This is the last chapter" is on
 * @param tellFollowers - true when "Tell followers" is on (board D06)
 * @returns the outcome; 'not_last' when a later chapter is already out or scheduled
 * Errors: throws when the database can't be reached.
 */
export async function publishChapter(
  client: AppSupabaseClient,
  code: string,
  asLast: boolean,
  tellFollowers = true,
): Promise<ChapterActionOutcome> {
  const { data, error } = await client.rpc('publish_chapter', {
    chapter_code: code,
    as_last: asLast,
    // Board D06: "Tell followers"; off sends no notification for this chapter.
    tell_followers: tellFollowers,
  });
  if (error !== null) throw new Error(`Could not publish the chapter: ${error.message}`);
  return toActionOutcome(data);
}

/**
 * Turns the mark on or off on a chapter already scheduled or out.
 *
 * @param client - the shared Supabase client
 * @param code - the chapter's code
 * @param isLast - the switch's new state
 * @returns the outcome; 'not_last' or 'wrong_state' when the mark can't change
 * Errors: throws when the database can't be reached.
 */
export async function setChapterLast(
  client: AppSupabaseClient,
  code: string,
  isLast: boolean,
): Promise<ChapterActionOutcome> {
  const { data, error } = await client.rpc('set_chapter_last', {
    chapter_code: code,
    is_last: isLast,
  });
  if (error !== null) throw new Error(`Could not change the last-chapter mark: ${error.message}`);
  return toActionOutcome(data);
}
