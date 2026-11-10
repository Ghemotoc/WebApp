/**
 * The dates the Writers' hub shows: today's day in the eyebrow and how many days a contest has
 * left (bundle G9 WRITING, part a; board WritersHub: "Writers' hub · Friday 7 November" and
 * "Closes in 23 days").
 *
 * Who calls it: HubHero and HubContests. What it calls: lib/romania-time.ts, because contests
 * open and close by the Romanian calendar (S1-E11-15).
 */
import { dateLocaleFor, ROMANIA_TIME_ZONE, romaniaNowFields } from '@/lib/romania-time';

/** Milliseconds in one day, for counting days between two calendar dates. */
const dayLength = 24 * 60 * 60 * 1000;

/**
 * Writes today as Romania sees it, with the weekday: "Friday 7 November" or "vineri, 7 noiembrie".
 *
 * @param now - the moment to write
 * @param language - the interface language ("ro" or "en")
 * @returns the day's text
 */
export function formatHubDay(now: Date, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: ROMANIA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
}

/**
 * Counts the whole days from today (in Romania) to a contest's last day of entries.
 *
 * @param closesOn - the last day of entries, YYYY-MM-DD
 * @param now - the moment counted from
 * @returns 0 on the last day itself, 1 the day before, and so on; never below 0
 */
export function daysUntilClose(closesOn: string, now: Date): number {
  // Step 1: today's date on the Bucharest clock, as a YYYY-MM-DD text like closesOn.
  const today = romaniaNowFields(now).date;
  // Step 2: both dates at midnight UTC, so the difference is a whole number of days.
  const difference = Date.parse(`${closesOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round(difference / dayLength));
}
