/**
 * Dates for the followers line graph (bundle CALM-7b): the short dates under the axis ("3 Nov"),
 * and the longer ones in the tooltip and the table ("3 Nov", or "November 2026" for a month).
 *
 * A point's first day is a stored calendar day with no clock (a Romanian date from the database),
 * so it is written as it is, in UTC, and reads the same day for every viewer (the same rule as
 * the old weekly bars; Robert, 20 Nov 2026, 18:36 UTC).
 * Who uses it: FollowersLinePlot and FollowersTable. It calls Intl.DateTimeFormat.
 */
import { dateLocaleFor } from '@/lib/romania-time';

import type { FollowersStep } from '../api/followersLine';

/**
 * The calendar day as a Date at noon UTC, so no time zone can move it to another day.
 *
 * @param day - YYYY-MM-DD
 * @returns the Date
 */
function noonOf(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

/**
 * The date under the axis: "3 Nov" for a day or a week, "Nov" for a month.
 *
 * @param day - the point's first day, YYYY-MM-DD
 * @param step - what one point stands for
 * @param language - the interface language
 * @returns the short date
 */
export function axisDate(day: string, step: FollowersStep, language: string): string {
  const options: Intl.DateTimeFormatOptions =
    step === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(dateLocaleFor(language), { timeZone: 'UTC', ...options }).format(
    noonOf(day),
  );
}

/**
 * The date in the tooltip and the table: "3 Nov" for a day or a week, "November 2026" for a month.
 *
 * @param day - the point's first day, YYYY-MM-DD
 * @param step - what one point stands for
 * @param language - the interface language
 * @returns the date
 */
export function pointDate(day: string, step: FollowersStep, language: string): string {
  const options: Intl.DateTimeFormatOptions =
    step === 'month' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(dateLocaleFor(language), { timeZone: 'UTC', ...options }).format(
    noonOf(day),
  );
}
