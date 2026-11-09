/**
 * readerLevels: the reading level ladder as the profile draws it, and how far a reader is from
 * the next level (bundle G7a; Robert approved reader levels on 7 Nov 2026, 19:53 UTC; the tests
 * are the DESIGN thread's, 7 Nov 2026, 19:56 UTC).
 *
 * The database decides the level (reader_level_from() in
 * supabase/migrations/…_g7a_reader_levels.sql); this file mirrors the same thresholds only to draw
 * the ladder and the progress bar, never to decide. If the two ever disagree, the level shown is
 * still the database's.
 * Who calls it: api/readerLevel.ts, ReaderLevelPanel and ReaderLevelLadder. It calls nothing.
 */
import type { Enums } from '@/lib/database.types';

/** One of the four levels (generated from the reader_level enum). */
export type ReaderLevel = Enums<'reader_level'>;

/** The ladder, lowest first: one test per level, and time never counts. */
export const readerLevelLadder: readonly ReaderLevel[] = [
  'new_reader',
  'reader',
  'bookworm',
  'story_devourer',
];

/** The thresholds, the same numbers as reader_level_from() in the database. */
export const readerLevelThresholds = {
  newReaderChapters: 1,
  readerChapters: 50,
  bookwormStories: 10,
  storyDevourerStories: 40,
} as const;

/** How far the reader is towards the next level, counted in chapters or in stories. */
export interface ReaderLevelProgress {
  nextLevel: ReaderLevel;
  unit: 'chapters' | 'stories';
  have: number;
  need: number;
}

/**
 * Whether a rung is reached for a reader at the given level.
 *
 * @param rung - the level on the ladder
 * @param current - the reader's level, or null before the first chapter
 * @returns true when the rung is at or below the reader's level
 */
export function isReaderLevelReached(rung: ReaderLevel, current: ReaderLevel | null): boolean {
  if (current === null) return false;
  return readerLevelLadder.indexOf(rung) <= readerLevelLadder.indexOf(current);
}

/**
 * How far a reader is from the next level.
 *
 * @param level - their level now, or null before their first chapter read
 * @param chaptersRead - chapters read to 95 per cent or more
 * @param storiesFinished - completed stories read to the end
 * @returns the progress, or null for a Story devourer (the top level)
 */
export function progressToNextReaderLevel(
  level: ReaderLevel | null,
  chaptersRead: number,
  storiesFinished: number,
): ReaderLevelProgress | null {
  // Step 1: the first two levels count chapters.
  if (level === null) {
    return { nextLevel: 'new_reader', unit: 'chapters', have: chaptersRead, need: 1 };
  }
  if (level === 'new_reader') {
    const need = readerLevelThresholds.readerChapters;
    return { nextLevel: 'reader', unit: 'chapters', have: chaptersRead, need };
  }
  // Step 2: the last two count finished stories.
  if (level === 'reader') {
    const need = readerLevelThresholds.bookwormStories;
    return { nextLevel: 'bookworm', unit: 'stories', have: storiesFinished, need };
  }
  if (level === 'bookworm') {
    const need = readerLevelThresholds.storyDevourerStories;
    return { nextLevel: 'story_devourer', unit: 'stories', have: storiesFinished, need };
  }
  // Step 3: a Story devourer is at the top.
  return null;
}

/**
 * Turns a value from the database into a level, or null when it isn't one.
 *
 * @param value - the JSON value
 * @returns the level or null
 */
export function readerLevelFrom(value: unknown): ReaderLevel | null {
  const known = readerLevelLadder.find((candidate) => candidate === value);
  return known ?? null;
}
