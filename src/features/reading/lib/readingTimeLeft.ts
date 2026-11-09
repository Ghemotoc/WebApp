/**
 * readingTimeLeft: how many minutes of the chapter are left, from how far the reader has
 * scrolled (bundle G7d; rulebook: "The reading time floats at the bottom while there is still
 * text to scroll").
 * Who calls it: ReadingTimeLeft (the floating pill in the reader).
 * What it calls: nothing; a plain sum, tested in readingTimeLeft.test.ts.
 */

/**
 * The minutes still to read, or null once the text is finished.
 *
 * @param minutesToRead - the whole chapter's reading time (get_chapter(), at least 1)
 * @param progress - how far through the text the reader is, 0 to 100 (useReadingProgress)
 * @returns whole minutes, at least 1, rounded up so the pill never says 0 while text is left;
 *   null at 100%, when the pill goes away
 */
export function minutesLeft(minutesToRead: number, progress: number): number | null {
  // Step 1: the last line is on screen, so there is nothing left to scroll.
  if (progress >= 100) return null;
  // Step 2: the share of the chapter still below the window, in whole minutes.
  const share = (100 - Math.max(0, progress)) / 100;
  return Math.max(1, Math.ceil(minutesToRead * share));
}
