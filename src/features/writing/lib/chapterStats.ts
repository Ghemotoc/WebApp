/**
 * The four numbers at the top of a story's Chapters page (board D03, user story 5.3): how many
 * chapters and in which state ("16 · 15 out, 1 draft"), the words already out ("31.4k · 15
 * chapters out"), the reads of all time and the story's status ("Completed · Chapter 15 is the
 * last").
 *
 * Reads come from the writer dashboard's per-chapter totals (writer_dashboard(), S1-E3-07),
 * which already hide any count from one to four as null ("fewer than 5"). A story total built
 * from them never guesses: the hidden chapters count as at least one read each, and the number
 * then shows with a "+" ("18k+"), so it is always true and gives no reader away.
 * Who calls it: ChapterStats. What it calls: nothing; it only adds up what it is given.
 */
import type { DashboardChapter } from '../api/dashboard';
import type { ManagedChapter } from '../api/manageChapters';

/** The chapters by state, and the words of the published ones. */
export interface ChapterCounts {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  unpublished: number;
  /** Words in the chapters readers can open now. */
  publishedWords: number;
  /** The number (place in the reading order) of the chapter marked as the last, or null. */
  markedLastNumber: number | null;
}

/** A story's reads of all time: the smallest true total, and whether it is only a floor. */
export interface StoryReads {
  atLeast: number;
  /** True when some chapter's count is hidden ("fewer than 5"), so the total shows with "+". */
  isFloor: boolean;
}

/**
 * Counts the live chapters by state.
 *
 * @param chapters - the story's live chapters, in reading order
 * @returns the counts, the published words and the marked last chapter's number
 */
export function chapterCounts(chapters: ManagedChapter[]): ChapterCounts {
  // Step 1: one pass by state.
  const ofState = (state: ManagedChapter['state']) =>
    chapters.filter((chapter) => chapter.state === state);
  const published = ofState('published');
  // Step 2: the marked chapter's place in the reading order, counted from 1.
  const markedIndex = chapters.findIndex((chapter) => chapter.isMarkedLast);
  return {
    total: chapters.length,
    published: published.length,
    drafts: ofState('draft').length,
    scheduled: ofState('scheduled').length,
    unpublished: ofState('unpublished').length,
    publishedWords: published.reduce((total, chapter) => total + chapter.wordCount, 0),
    markedLastNumber: markedIndex === -1 ? null : markedIndex + 1,
  };
}

/**
 * Adds up one story's reads of all time from the dashboard's chapters.
 *
 * @param chapters - every chapter on the writer dashboard (all stories), all-time period
 * @param storySlug - the story to add up
 * @returns the total, or null when the story has no published chapter on the dashboard
 */
export function storyReads(chapters: DashboardChapter[], storySlug: string): StoryReads | null {
  // Step 1: only this story's chapters that readers could open at some point.
  const counted = chapters.filter(
    (chapter) => chapter.storySlug === storySlug && chapter.firstPublishedAt !== null,
  );
  if (counted.length === 0) return null;
  // Step 2: known counts add up; a hidden one is at least one read.
  let atLeast = 0;
  let isFloor = false;
  for (const chapter of counted) {
    if (chapter.reads === null) {
      atLeast += 1;
      isFloor = true;
    } else {
      atLeast += chapter.reads;
    }
  }
  return { atLeast, isFloor };
}

/**
 * Finds one chapter's likes on the dashboard, for the row's meta line.
 *
 * @param chapters - every chapter on the writer dashboard
 * @param chapterCode - the chapter
 * @returns the likes, or null when unknown or hidden ("fewer than 5")
 */
export function chapterLikes(chapters: DashboardChapter[], chapterCode: string): number | null {
  return chapters.find((chapter) => chapter.chapterCode === chapterCode)?.likes ?? null;
}
