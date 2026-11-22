/**
 * The Home page's writing-month numbers: which day of the month it is and how many words a day
 * would still reach the goal (bundle CALM-7c; board New-Home: "Writing month, day 7" and
 * "1,980 words a day keeps you on track").
 *
 * The writing month runs on the Romanian calendar, as my_writing_month() counts it (GAPS-12f),
 * so both numbers use the Bucharest date.
 * Who calls it: HubHero and HubMonthSummary. What it calls: lib/romania-time.ts.
 */
import { romaniaNowFields } from '@/lib/romania-time';

/**
 * Today's day of the month on the Bucharest calendar.
 *
 * @param now - the moment to read
 * @returns 1 to 31
 */
export function writingMonthDay(now: Date): number {
  // The Bucharest date is "YYYY-MM-DD"; its last part is the day.
  const date = romaniaNowFields(now).date;
  return Number(date.slice(8, 10));
}

/**
 * How many days are left in the month, today included.
 *
 * @param now - the moment to read
 * @returns 1 on the last day of the month
 */
export function daysLeftInMonth(now: Date): number {
  // Step 1: the year and month on the Bucharest calendar.
  const date = romaniaNowFields(now).date;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  // Step 2: day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return lastDay - writingMonthDay(now) + 1;
}

/**
 * The words a day that would still reach the goal by the end of the month.
 *
 * @param words - the month's words so far
 * @param goal - the month's goal
 * @param now - the moment to read
 * @returns the words a day, rounded up; 0 once the goal is reached
 */
export function wordsPerDayToGoal(words: number, goal: number, now: Date): number {
  const wordsLeft = goal - words;
  if (wordsLeft <= 0) return 0;
  return Math.ceil(wordsLeft / daysLeftInMonth(now));
}
