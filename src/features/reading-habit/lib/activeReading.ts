/**
 * Whether the reader is actively reading, for the private streak's minute counter (bundle
 * IDEAS-1, part b; idea IDEA-20261031-13).
 *
 * A minute counts only while the chapter is on screen (the tab is visible) and the reader has
 * scrolled, pressed a key or touched the page in the last two minutes, so a chapter left open
 * overnight doesn't fill the day.
 * Who calls it: hooks/useReadingMinutes.ts. Tested in activeReading.test.ts.
 */

/** How long after the last scroll, key or touch the reader still counts as reading. */
export const activeForMilliseconds = 2 * 60 * 1000;

/**
 * Whether a minute just passed should count.
 *
 * @param isVisible - whether the tab is on screen
 * @param lastActivityAt - when the reader last scrolled, pressed a key or touched (ms)
 * @param now - the time now (ms)
 * @returns true when it counts
 */
export function isActivelyReading(
  isVisible: boolean,
  lastActivityAt: number,
  now: number,
): boolean {
  return isVisible && now - lastActivityAt <= activeForMilliseconds;
}
