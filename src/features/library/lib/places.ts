/**
 * Small rules about a reader's place in a story (story S1-E4-03; board 3.7 Library).
 *
 * Who calls it: ContinueReadingCard and StoryReadingActions.
 */
import type { StoryPlace } from '../api/library';

/** Where in a chapter a place is, for "near the start of", "halfway through", "near the end of". */
export type PlaceWithinChapter = 'start' | 'middle' | 'end';

/**
 * Where in its chapter a place sits, in thirds.
 *
 * @param percent - how far through, 0 to 100
 * @returns start, middle or end
 */
export function placeWithinChapter(percent: number): PlaceWithinChapter {
  if (percent < 34) return 'start';
  if (percent < 67) return 'middle';
  return 'end';
}

/** A place this far through a chapter counts as having finished it. */
const finishedChapterPercent = 95;

/**
 * Where "Continue" leads: the chapter after the place once it is finished and there is one,
 * otherwise the chapter of the place (the reader screen then offers to go back to the line).
 *
 * @param storySlug - the story's address
 * @param place - the reader's place
 * @returns the reader's address
 */
export function continueAddress(storySlug: string, place: StoryPlace): string {
  const hasFinishedChapter = place.percent >= finishedChapterPercent;
  const chapterCode =
    hasFinishedChapter && place.nextCode !== null ? place.nextCode : place.chapterCode;
  return `/s/${storySlug}/${chapterCode}`;
}

/**
 * The number of the chapter "Continue" opens.
 *
 * @param place - the reader's place
 * @returns the chapter number
 */
export function continueChapterNumber(place: StoryPlace): number {
  const movesOn = place.percent >= finishedChapterPercent && place.nextCode !== null;
  return movesOn ? place.number + 1 : place.number;
}

/**
 * The number of a chapter that came out after the one the reader finished, for "Chapter 15 is
 * out" (board 3.7).
 *
 * @param place - the reader's place
 * @returns the new chapter's number, or null when the reader isn't waiting on one
 */
export function newChapterNumber(place: StoryPlace): number | null {
  const finishedItsChapter = place.percent >= finishedChapterPercent;
  return finishedItsChapter && place.nextCode !== null ? place.number + 1 : null;
}
