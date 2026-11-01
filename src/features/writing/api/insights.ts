/**
 * A chapter's "Lines and stops" for its writer (bundle IDEAS-1, part d; ideas IDEA-20261031-1 and
 * -5): the most-loved lines and where readers stop.
 *
 * Who calls it: hooks/useChapterInsights.ts.
 * What it calls next: writer_chapter_insights() (supabase/migrations/…_ideas1_d_writer_insights.sql),
 * which answers only for the caller's own published chapter and already applies the "fewer than
 * 5" rule: a count from one to four comes back as null, and the bar is null below five readers.
 * It never returns a reader's ID.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ShownCount } from './dashboard';

/** One of a chapter's most-loved paragraphs. */
export interface LovedLine {
  /** The paragraph's number in today's text, counted from 1. */
  number: number;
  /** Its first words, Markdown marks dropped (a picture as its alt text in brackets). */
  excerpt: string;
  shares: ShownCount;
  comments: ShownCount;
  total: ShownCount;
}

/** Where readers' saved places sit in a chapter. */
export interface ReaderStops {
  /** How many readers have a place; null for "fewer than 5". */
  readers: ShownCount;
  /** Ten whole percentages, one per tenth of the chapter; null below five readers. */
  tenths: number[] | null;
}

/** Both views for one chapter. */
export interface ChapterInsights {
  lovedLines: LovedLine[];
  stops: ReaderStops;
}

/** The database's JSON for both views. */
interface InsightsRow {
  loved_lines: LovedLine[];
  stops: { readers: ShownCount; tenths: number[] | null };
}

/**
 * Reads a chapter's most-loved lines and where readers stop.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns both views, or null when the chapter isn't the caller's or isn't published
 * Errors: throws with Supabase's message (signed out, or the database can't be reached).
 */
export async function fetchChapterInsights(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string,
): Promise<ChapterInsights | null> {
  const { data, error } = await client.rpc('writer_chapter_insights', {
    story_slug: storySlug,
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the chapter's numbers: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as InsightsRow;
  return {
    lovedLines: row.loved_lines,
    stops: { readers: row.stops.readers, tenths: row.stops.tenths },
  };
}
