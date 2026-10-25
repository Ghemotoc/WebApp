/**
 * Which day heading a notification sits under: Today, Yesterday, Earlier this week or Older
 * (story S1-E7-01; board 6.2).
 *
 * Who calls it: NotificationsPage. Days are counted in Romanian time (src/lib/romania-time.ts),
 * the market's clock for March, so "Today" turns over at midnight in Bucharest.
 */
import { ROMANIA_TIME_ZONE } from '@/lib/romania-time';

/** The four headings, newest first. */
export const dayGroups = ['today', 'yesterday', 'thisWeek', 'older'] as const;

/** One of the headings. */
export type DayGroup = (typeof dayGroups)[number];

/** The calendar day of a moment in Romania, as YYYY-MM-DD (en-CA writes dates that way). */
const romanianDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: ROMANIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Whole days between two moments' calendar days in Romania.
 *
 * @returns 0 for the same day, 1 for the day before and so on
 */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const earlierDay = Date.parse(romanianDay.format(earlier));
  const laterDay = Date.parse(romanianDay.format(later));
  return Math.round((laterDay - earlierDay) / (24 * 3600 * 1000));
}

/**
 * The heading for one notification.
 *
 * @param isoDate - the notification's latest activity
 * @param now - the time to count from (a test passes its own)
 * @returns today, yesterday, thisWeek (2 to 6 days ago) or older
 */
export function dayGroupOf(isoDate: string, now: Date = new Date()): DayGroup {
  const daysAgo = calendarDaysBetween(new Date(isoDate), now);
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 7) return 'thisWeek';
  return 'older';
}
