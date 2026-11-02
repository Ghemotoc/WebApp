/**
 * Dates and deadlines of data requests, in words staff and the person read (bundle ADMIN-2, part
 * c1; story S1-E11-09 criterion 2: the deadline is shown, with a reminder 7 days before and an
 * alert 2 days before).
 *
 * Who calls it: the staff list and page (components/staff/) and Settings › Data requests.
 * What it calls: src/lib/romania-time.ts for the date in the interface language.
 */
import type { PillTone } from '@/components/ui/InfoPill';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { DataRequestUrgency } from '../api/dataRequests';

/**
 * Shows a calendar date ("2027-02-28") as "28 februarie 2027" or "28 February 2027".
 *
 * @param calendarDate - the date as yyyy-mm-dd
 * @param language - the interface language
 * @returns the date in words
 */
export function formatCalendarDate(calendarDate: string, language: string): string {
  // Noon UTC is the same day in Bucharest whatever the season, so the day never slips.
  return formatRomaniaDate(new Date(`${calendarDate}T12:00:00Z`), language);
}

/**
 * Counts the days from today to a deadline: 0 on the day itself, below 0 once it has passed.
 *
 * @param deadline - the deadline as yyyy-mm-dd
 * @param today - today as yyyy-mm-dd
 * @returns the whole number of days
 */
export function daysLeft(deadline: string, today: string): number {
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  const difference = Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(difference / millisecondsInADay);
}

/** The pill colour of each urgency: red-like blush only for overdue and the 2-day alert. */
const urgencyTones: Record<DataRequestUrgency, PillTone> = {
  overdue: 'blush',
  alert: 'blush',
  reminder: 'gold',
  on_time: 'sage',
  closed: 'neutral',
};

/**
 * The pill colour for an urgency (DoD pill system: a pastel tint, the words carry the meaning).
 *
 * @param urgency - from the database
 * @returns the tone
 */
export function urgencyTone(urgency: DataRequestUrgency): PillTone {
  return urgencyTones[urgency];
}

/**
 * The extra months staff may still give a request: one or two at first, two after one month was
 * given, none after two (GDPR art. 12(3): at most two further months).
 *
 * @param dueOn - the first deadline, as yyyy-mm-dd
 * @param extendedTo - the extended deadline, or null
 * @returns the choices, as numbers of months counted from the first deadline
 */
export function extensionChoices(dueOn: string, extendedTo: string | null): Array<1 | 2> {
  if (extendedTo === null) return [1, 2];
  const [dueYear = 0, dueMonth = 0] = dueOn.split('-').map(Number);
  const [extendedYear = 0, extendedMonth = 0] = extendedTo.split('-').map(Number);
  const monthsGiven = (extendedYear - dueYear) * 12 + (extendedMonth - dueMonth);
  return monthsGiven < 2 ? [2] : [];
}
