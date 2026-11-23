/**
 * Which chapters a long story's chapter list folds away (CALM-9, Robert's canvas comments of
 * 23 Nov 2026, board B01: chapters 1 to 10 and the latest, then "Show all N chapters").
 * Who calls it: components/StoryChapterList.tsx. It calls nothing.
 */
import type { StoryPageChapter } from '../api/storyPage';

/** How many chapters show from the start of a folded list, before the latest one (CALM-9). */
const CHAPTERS_SHOWN_FOLDED = 10;

/**
 * The chapters a folded list hides: everything after the first ten except the latest one and
 * the chapter the reader is in. A list of 11 or fewer never folds, since hiding nothing (or one
 * row) behind a button helps nobody.
 *
 * @param chapters - the chapters in order
 * @param placeCode - the code of the reader's current chapter, or null
 * @returns the codes of the chapters to hide while folded
 */
export function foldedChapterCodes(
  chapters: StoryPageChapter[],
  placeCode: string | null,
): Set<string> {
  const folded = new Set<string>();
  if (chapters.length <= CHAPTERS_SHOWN_FOLDED + 1) return folded;
  // Step 1: the middle of the list, between chapter 10 and the latest.
  const middle = chapters.slice(CHAPTERS_SHOWN_FOLDED, -1);
  // Step 2: hide each of them, except where the reader stopped.
  for (const chapter of middle) {
    if (chapter.code !== placeCode) folded.add(chapter.code);
  }
  return folded;
}
