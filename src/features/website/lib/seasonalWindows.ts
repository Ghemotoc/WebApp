/**
 * seasonalWindows: the small date sums behind Staff › Website › Seasonal looks (bundle G12a; the
 * canvas's StaffWebsiteSeasonal board).
 *
 * A seasonal window is a look (winter, spring, summer, autumn) with a first and a last day written
 * as month-day ("01-08"), with no year: the same days every year. A window whose first day comes
 * after its last (12-01 to 02-29) crosses the new year, as src/lib/looks.ts reads it.
 * Who calls it: SeasonalLooksTab and SeasonalWindowForm. The database checks the same rules again
 * in seasonal_window_problem() when the page saves.
 */
import type { SeasonalWindow } from '@/lib/looks';
import { dateLocaleFor, withShortSeptember } from '@/lib/romania-time';

/** The month and day of a month-day such as "01-08", as numbers (1 to 12, 1 to 31). */
export interface MonthAndDay {
  month: number;
  day: number;
}

/**
 * Splits a month-day into its numbers.
 *
 * @param monthDay - for example "01-08"
 * @returns { month: 1, day: 8 }
 */
export function partsOf(monthDay: string): MonthAndDay {
  const [month, day] = monthDay.split('-');
  return { month: Number(month), day: Number(day) };
}

/**
 * Joins a month and a day into a month-day.
 *
 * @param parts - the month (1 to 12) and the day (1 to 31)
 * @returns for example "01-08"
 */
export function monthDayFrom(parts: MonthAndDay): string {
  return `${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/**
 * How many days a month can have. February has 29, so a window can end on 29 February; in other
 * years it simply ends on the 28th.
 *
 * @param month - 1 to 12
 * @returns 29, 30 or 31
 */
export function daysInMonth(month: number): number {
  // Day 0 of the next month is the last day of this one; 2000 was a leap year.
  return new Date(2000, month, 0).getDate();
}

/**
 * Says whether a month-day falls inside a window, first and last day included.
 *
 * @returns true inside the window
 */
function isInside(monthDay: string, window: SeasonalWindow): boolean {
  if (window.from <= window.to) return monthDay >= window.from && monthDay <= window.to;
  return monthDay >= window.from || monthDay <= window.to;
}

/**
 * Says whether any day of the year sits inside two windows, which the database refuses.
 *
 * @param windows - the four windows as the form holds them
 * @returns true when two windows share a day
 */
export function windowsOverlap(windows: readonly SeasonalWindow[]): boolean {
  // Step 1: walk every day of a leap year, so 29 February is counted too.
  for (let dayOfYear = 0; dayOfYear < 366; dayOfYear += 1) {
    const date = new Date(2000, 0, 1 + dayOfYear);
    const monthDay = monthDayFrom({ month: date.getMonth() + 1, day: date.getDate() });
    // Step 2: count the windows that hold this day.
    const holding = windows.filter((window) => isInside(monthDay, window)).length;
    if (holding > 1) return true;
  }
  return false;
}

/**
 * A month-day in the reader's language, for example "8 Jan" or "8 ian.".
 *
 * @param monthDay - for example "01-08"
 * @param language - the interface language
 * @returns the short day and month, in British order for English ("8 Jan", not "Jan 8")
 */
export function formatMonthDay(monthDay: string, language: string): string {
  const { month, day } = partsOf(monthDay);
  const format = new Intl.DateTimeFormat(dateLocaleFor(language), {
    day: 'numeric',
    month: 'short',
  });
  return withShortSeptember(format.format(new Date(2000, month - 1, day)));
}

/**
 * The months' names in the reader's language, January first, for the month drop-down.
 *
 * @param language - the interface language
 * @returns twelve names
 */
export function monthNames(language: string): string[] {
  const format = new Intl.DateTimeFormat(dateLocaleFor(language), { month: 'long' });
  return Array.from({ length: 12 }, (_, index) => format.format(new Date(2000, index, 1)));
}
