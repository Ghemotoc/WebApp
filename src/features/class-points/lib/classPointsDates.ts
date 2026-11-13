/**
 * Dates on the class points screens (bundle CLASS-POINTS, part 1; story S1-E8-13).
 *
 * A class points week runs Monday 00:00 to Sunday 23:59 (the database's
 * class_points_week_start()). The database sends the Monday a new budget starts as a plain day
 * ("2027-03-08"); these helpers turn it into words. Who calls it: ClassPointsCard and
 * GivePointsForm. What it calls: dateLocaleFor(), so English dates are written the British way.
 */
import { dateLocaleFor } from '@/lib/romania-time';

/**
 * A plain day as people read it, with its weekday ("Monday 8 March").
 *
 * @param day - the day as YYYY-MM-DD
 * @param language - the interface language
 * @returns the weekday, day and month; the day as given when it can't be read
 */
export function dayText(day: string, language: string): string {
  // Noon UTC keeps the same calendar day in every time zone a reader may be in.
  const moment = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(moment.getTime())) return day;
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(moment);
}

/**
 * The last day of the week that ends when a new budget starts: the Sunday before that Monday.
 *
 * @param resetsOn - the Monday a new budget starts, as YYYY-MM-DD
 * @returns the Sunday before it, as YYYY-MM-DD; the input when it can't be read
 */
export function lastDayBefore(resetsOn: string): string {
  const moment = new Date(`${resetsOn}T12:00:00Z`);
  if (Number.isNaN(moment.getTime())) return resetsOn;
  moment.setUTCDate(moment.getUTCDate() - 1);
  return moment.toISOString().slice(0, 10);
}
