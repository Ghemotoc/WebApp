/**
 * writerRanks: the rank ladder as the screens draw it, and how far a writer is from the next
 * rank (story S1-E8-09; board 6.1, the rank panel).
 *
 * The database decides the rank (rank_for() in supabase/migrations/…_forums2_e_ranks.sql); this
 * file mirrors the same thresholds only to draw the ladder and the progress bar, never to decide.
 * If the two ever disagree, the rank shown is still the database's.
 * Who calls it: RankPanel, RankLadder and RankProgressBar in ../components. It calls nothing.
 */
import type { Enums } from '@/lib/database.types';

/** One of the four ranks (generated from the writer_rank enum). */
export type WriterRank = Enums<'writer_rank'>;

/** One rung of the ladder. */
export interface RankRung {
  rank: WriterRank;
}

/**
 * The ladder, lowest first (S1-E8-09 criterion 2; decided 17 Oct 2026): New writer at the first
 * chapter, Writer at 5 chapters, Storyteller at 15 chapters or 30,000 words, Novelist at 100,000
 * words. A rank shows as a text pill, never a sticker (bundle G4; DESIGN thread, 8 Nov 2026).
 */
export const rankLadder: readonly RankRung[] = [
  { rank: 'new_writer' },
  { rank: 'writer' },
  { rank: 'storyteller' },
  { rank: 'novelist' },
];

/** The thresholds, the same numbers as rank_for() in the database. */
export const rankThresholds = {
  writerChapters: 5,
  storytellerChapters: 15,
  storytellerWords: 30000,
  novelistWords: 100000,
} as const;

/** How far the writer is towards the next rank, counted in chapters or in words. */
export interface RankProgress {
  nextRank: WriterRank;
  unit: 'chapters' | 'words';
  have: number;
  need: number;
}

/**
 * Whether a rung is reached for a writer of the given rank.
 *
 * @param rung - the rank on the ladder
 * @param current - the writer's rank
 * @returns true when the rung is at or below the writer's rank
 */
export function isRankReached(rung: WriterRank, current: WriterRank): boolean {
  const order = rankLadder.map((candidate) => candidate.rank);
  return order.indexOf(rung) <= order.indexOf(current);
}

/**
 * Progress from Writer to Storyteller: by chapters or by words, whichever is closer.
 *
 * @param chapters - published chapters
 * @param words - published words
 * @returns the closer of the two routes
 */
function towardsStoryteller(chapters: number, words: number): RankProgress {
  const byChapters = chapters / rankThresholds.storytellerChapters;
  const byWords = words / rankThresholds.storytellerWords;
  if (byWords > byChapters) {
    return {
      nextRank: 'storyteller',
      unit: 'words',
      have: words,
      need: rankThresholds.storytellerWords,
    };
  }
  return {
    nextRank: 'storyteller',
    unit: 'chapters',
    have: chapters,
    need: rankThresholds.storytellerChapters,
  };
}

/**
 * How far a writer is from the next rank.
 *
 * @param rank - their rank now
 * @param chapters - their published chapters
 * @param words - their published words
 * @returns the progress, or null for a Novelist (the top rank)
 */
export function progressToNextRank(
  rank: WriterRank,
  chapters: number,
  words: number,
): RankProgress | null {
  // Step 1: each rank has one way up, except Writer, which has two (chapters or words).
  if (rank === 'new_writer') {
    return {
      nextRank: 'writer',
      unit: 'chapters',
      have: chapters,
      need: rankThresholds.writerChapters,
    };
  }
  if (rank === 'writer') return towardsStoryteller(chapters, words);
  if (rank === 'storyteller') {
    return { nextRank: 'novelist', unit: 'words', have: words, need: rankThresholds.novelistWords };
  }
  // Step 2: a Novelist is at the top.
  return null;
}

/**
 * Turns a value from the database into a rank, or null when it isn't one.
 *
 * @param value - the JSON value (a post's author_rank, the profile's rank)
 * @returns the rank or null
 */
export function rankFrom(value: unknown): WriterRank | null {
  const known = rankLadder.find((candidate) => candidate.rank === value);
  return known === undefined ? null : known.rank;
}
