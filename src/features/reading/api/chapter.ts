/**
 * Reads one chapter for the reader and counts a read (story S1-E4-01a; ADR 0004).
 *
 * Who calls it: hooks/useChapter.ts and hooks/useRecordRead.ts.
 * What it calls next: get_chapter(story_slug, chapter_code), the only way a reader reaches a
 * chapter's text. It answers nothing when the reader may not see the chapter: unpublished,
 * deleted, hidden by a moderator, rated above the reader's age or by someone either side blocks.
 * It never carries the user ID. A signed-out visitor gets only the teaser: the first whole
 * paragraphs up to 600 words, cut on the server (S1-E4-04). The pictures in the text come with
 * it, each with its check state (S1-E3-09); their files are read through signed addresses. So
 * do the music and video cards, each with its service and what to play (S1-E3-10).
 * record_chapter_read(story_slug, chapter_code) adds one to today's total, never who read
 * (supabase/migrations/…_s1_e4_01a_reader.sql).
 */
import { embedViewsFromJson, type EmbedView } from '@/features/embeds/api/embeds';
import { pictureViewsFromJson, type PictureView } from '@/features/pictures/api/pictures';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One chapter as the reader shows it. */
export interface ReaderChapter {
  story: {
    slug: string;
    title: string;
    /** The story's language, for the text's lang attribute (WCAG 3.1.2). */
    languageCode: string;
    writer: { displayName: string; handle: string };
  };
  /** The chapter's row ID, which the Report button sends (S1-E10-01); never a user ID. */
  id: string;
  code: string;
  title: string;
  /** Its number among the chapters readers can open (1, 2, 3…), and how many there are. */
  number: number;
  total: number;
  previousCode: string | null;
  nextCode: string | null;
  publishedAt: string | null;
  editedAt: string | null;
  minutesToRead: number;
  isOwner: boolean;
  /** True for a signed-out visitor. */
  needsSignIn: boolean;
  /** True when body is only the teaser, for a signed-out visitor (S1-E4-04). */
  isTeaser: boolean;
  /** True when the chapter goes on after the teaser. */
  textContinues: boolean;
  /**
   * True when the writer chose "In the app only" and that applies now (S1-E3-08, GAPS-15): the
   * body is empty and the reader shows the app only notice instead (S1-E4-09).
   */
  appOnly: boolean;
  /** The published text as the Markdown subset (ADR 0005), or only its teaser. */
  body: string | null;
  /**
   * The pictures in that text by ID, with their check state and a signed address for those the
   * reader may see (S1-E3-09).
   */
  pictures: Record<string, PictureView>;
  /** The music and video cards in that text by ID (S1-E3-10). */
  embeds: Record<string, EmbedView>;
}

/** The shape get_chapter() answers, as JSON. */
interface ChapterRow {
  story: {
    slug: string;
    title: string;
    language_code: string;
    writer: { display_name: string; handle: string };
  };
  id: string;
  code: string;
  title: string;
  number: number;
  total: number;
  previous_code: string | null;
  next_code: string | null;
  published_at: string | null;
  edited_at: string | null;
  minutes_to_read: number;
  is_owner: boolean;
  needs_sign_in: boolean;
  is_teaser: boolean;
  text_continues: boolean;
  /** GAPS-15: missing from answers saved before the switch existed (prefetch caches). */
  app_only?: boolean;
  body: string | null;
  pictures?: Json;
  embeds?: Json;
}

/**
 * Reads a chapter.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @param chapterCode - the chapter's 8-character code
 * @returns the chapter, or null when the reader may not see it
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchChapter(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string,
): Promise<ReaderChapter | null> {
  const { data, error } = await client.rpc('get_chapter', {
    story_slug: storySlug,
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the chapter: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as ChapterRow;
  return {
    story: {
      slug: row.story.slug,
      title: row.story.title,
      languageCode: row.story.language_code,
      writer: { displayName: row.story.writer.display_name, handle: row.story.writer.handle },
    },
    id: row.id,
    code: row.code,
    title: row.title,
    number: row.number,
    total: row.total,
    previousCode: row.previous_code,
    nextCode: row.next_code,
    publishedAt: row.published_at,
    editedAt: row.edited_at,
    minutesToRead: row.minutes_to_read,
    isOwner: row.is_owner,
    needsSignIn: row.needs_sign_in,
    isTeaser: row.is_teaser,
    appOnly: row.app_only === true,
    textContinues: row.text_continues,
    body: row.body,
    // Signed addresses for the pictures the reader may see; Storage refuses the others.
    pictures: await pictureViewsFromJson(client, row.pictures),
    embeds: embedViewsFromJson(row.embeds),
  };
}

/**
 * Adds one to today's read total for the chapter.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @param chapterCode - the chapter's code
 * @returns true when it was counted (not for the writer's own reads)
 * Errors: throws with Supabase's message when the call fails.
 */
export async function recordChapterRead(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('record_chapter_read', {
    story_slug: storySlug,
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not count the read: ${error.message}`);
  return data === true;
}
