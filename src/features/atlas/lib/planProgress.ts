/**
 * The words written against the story's target, for the at-a-glance page (story S1-E17-06:
 * "the total words written show against the story target as a number and a progress bar with a
 * text equivalent").
 *
 * Who calls it: WordsProgress.
 */

/**
 * How far the drafts are towards the target, as a whole percentage.
 *
 * @param wordsWritten - the words in the chapters' drafts
 * @param wordTarget - the story's target (1 or more; the database refuses 0)
 * @returns 0 to 100; past the target it stays at 100 (the number beside it says how far past)
 */
export function percentOfTarget(wordsWritten: number, wordTarget: number): number {
  if (wordTarget <= 0) return 0;
  const percent = Math.floor((wordsWritten / wordTarget) * 100);
  return Math.min(100, Math.max(0, percent));
}
