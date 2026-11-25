/**
 * Which chapters a long story's chapter list folds away (CALM-9, Robert's canvas comments of
 * 23 Nov 2026, board B01: chapters 1 to 10 and the latest, then "Show all N chapters"), and
 * on phones the first 4 and the last 3, then "Show chapters 5 to 12" (user story 2.1, bundle 2).
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

/** How many chapters a phone shows from the start of a folded list (user story 2.1). */
const PHONE_CHAPTERS_FIRST = 4;

/** How many chapters a phone shows from the end of a folded list (user story 2.1). */
const PHONE_CHAPTERS_LAST = 3;

/** The chapters a phone folds away, and the numbers the fold button names ("5 to 12"). */
export interface PhoneFold {
  codes: Set<string>;
  /** The first and last folded chapter numbers, or null when nothing is folded. */
  range: { from: number; to: number } | null;
}

/**
 * The chapters a folded list hides on a phone: everything between the first four and the last
 * three, except the chapter the reader is in. A list of 8 or fewer never folds (hiding one row
 * behind a button helps nobody).
 *
 * @param chapters - the chapters in order
 * @param placeCode - the code of the reader's current chapter, or null
 * @returns the codes to hide and the range the button names
 */
export function phoneFoldedChapters(
  chapters: StoryPageChapter[],
  placeCode: string | null,
): PhoneFold {
  const codes = new Set<string>();
  if (chapters.length <= PHONE_CHAPTERS_FIRST + PHONE_CHAPTERS_LAST + 1) {
    return { codes, range: null };
  }
  // Step 1: the middle of the list, between chapter 4 and the last three.
  const middle = chapters.slice(PHONE_CHAPTERS_FIRST, -PHONE_CHAPTERS_LAST);
  // Step 2: hide each of them except where the reader stopped, and name the range the button opens.
  for (const chapter of middle) {
    if (chapter.code !== placeCode) codes.add(chapter.code);
  }
  const first = middle[0]?.number ?? 0;
  const last = middle[middle.length - 1]?.number ?? 0;
  return { codes, range: { from: first, to: last } };
}
