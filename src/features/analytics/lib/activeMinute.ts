/**
 * Whether a minute counts towards the investor numbers, and whether the page is a chapter (story
 * S1-E15-04, bundle ANALYTICS-1a).
 *
 * A minute counts only while the tab is visible and the person scrolled, pressed a key or touched
 * the page in the last two minutes (the reading streak's rule, reading-habit/lib/activeReading.ts),
 * so an app left open overnight doesn't fill the day.
 * Who calls it: components/ActiveMinutesCounter.tsx. Tested in activeMinute.test.ts.
 */
import { isActivelyReading } from '@/features/reading-habit/lib/activeReading';

/**
 * Whether the minute just passed counts.
 *
 * @param isVisible - whether the tab is on screen
 * @param lastActivityAt - when the person last scrolled, pressed a key or touched (ms)
 * @param now - the time now (ms)
 * @returns true when it counts
 */
export function minuteCounts(isVisible: boolean, lastActivityAt: number, now: number): boolean {
  return isActivelyReading(isVisible, lastActivityAt, now);
}

/**
 * Whether an address is a chapter in the reader: /s/<story>/<chapter>, with or without a shared
 * passage after it. The story page itself (/s/<story>) is not reading.
 *
 * @param pathname - the address's path
 * @returns true on a chapter
 */
export function isChapterPath(pathname: string): boolean {
  return /^\/s\/[^/]+\/[^/]+(\/[^/]+)?\/?$/.test(pathname);
}
