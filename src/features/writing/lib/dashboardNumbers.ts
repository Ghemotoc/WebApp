/**
 * How the writer dashboard writes its numbers (story S1-E3-07).
 *
 * Who calls it: the dashboard components (DashboardTotals, ChapterStatsTable, FollowersChart).
 * What it calls: Intl.NumberFormat only. The "fewer than 5" rule itself is in SQL
 * (writer_dashboard()); here a null count simply becomes the words "fewer than 5" (criterion 2).
 */
import { dateLocaleFor } from '@/lib/romania-time';

import type { ShownCount } from '../api/dashboard';

/**
 * Writes a count the reader's way ("1,431", "1.431"), or the "fewer than 5" words for null.
 *
 * @param count - the count, or null when it comes from fewer than 5
 * @param language - the interface language
 * @param fewerThanFive - the translated "fewer than 5"
 * @returns the text to show
 */
export function formatShownCount(
  count: ShownCount,
  language: string,
  fewerThanFive: string,
): string {
  if (count === null) return fewerThanFive;
  return new Intl.NumberFormat(dateLocaleFor(language)).format(count);
}

/**
 * Writes a read-through rate ("61%", "61 %"), or the "fewer than 5" words for null.
 *
 * @param percent - a whole percentage, or null below 5 readers
 * @param language - the interface language
 * @param fewerThanFive - the translated "fewer than 5"
 * @returns the text to show
 */
export function formatShownPercent(
  percent: ShownCount,
  language: string,
  fewerThanFive: string,
): string {
  if (percent === null) return fewerThanFive;
  return new Intl.NumberFormat(dateLocaleFor(language), { style: 'percent' }).format(percent / 100);
}

/**
 * The height of a bar in the followers chart, as a share of the tallest week.
 *
 * @param total - the week's new followers (null for "fewer than 5": drawn as a small bar)
 * @param tallest - the largest weekly total shown
 * @returns a percentage from 0 to 100
 */
export function barHeightPercent(total: ShownCount, tallest: number): number {
  // A "fewer than 5" week gets a short bar of about 2.5 followers, never its real height.
  if (total === 0) return 0;
  const value = total ?? 2.5;
  if (tallest <= 0) return 12;
  return Math.max(4, Math.round((Math.min(value, tallest) / tallest) * 100));
}
