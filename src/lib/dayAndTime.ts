/**
 * dayAndTime: a moment as the account pages' meta lines write it (user stories bundle 10, boards
 * J15, J21, J22 and J24): "today, 09:12" or "yesterday, 18:40" for the last two days, and the full
 * date, "14 October 2026", before that.
 *
 * "today" and "yesterday" come from the browser's Intl.RelativeTimeFormat ("azi", "ieri" in
 * Romanian), so there are no words of our own to translate (DoD: locale-aware dates). English
 * dates are British through dateLocaleFor (bundle 10). Days follow the reader's own clock.
 * Who calls it: the support and moderator mail pages. What it calls: Intl, dateLocaleFor.
 */
import { dateLocaleFor } from './romania-time';

/** One day in milliseconds. */
const oneDay = 24 * 60 * 60 * 1000;

/**
 * How many calendar days before `now` a moment falls: 0 today, 1 yesterday.
 *
 * @returns the whole number of days
 */
function daysBefore(moment: Date, now: Date): number {
  // Step 1: both moments at the start of their own day, on the reader's clock.
  const momentDay = new Date(moment.getFullYear(), moment.getMonth(), moment.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Step 2: rounded, so a day with a clock change (23 or 25 hours) still counts as one.
  return Math.round((today - momentDay) / oneDay);
}

/**
 * Writes a moment for a meta line.
 *
 * @param isoTime - the moment, as the database sends it
 * @param language - the interface language ("ro" or "en")
 * @param now - the time to count from (the current time; a test passes its own)
 * @returns "today, 09:12", "yesterday, 18:40" or "14 October 2026"
 */
export function dayAndTime(isoTime: string, language: string, now: Date = new Date()): string {
  const moment = new Date(isoTime);
  const locale = dateLocaleFor(language);
  const days = daysBefore(moment, now);
  // Step 1: older than yesterday (or a clock ahead of ours): the date alone.
  if (days < 0 || days > 1) {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(moment);
  }
  // Step 2: today or yesterday, in words, then the time on a 24-hour clock.
  const dayWord = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(moment);
  return `${dayWord}, ${time}`;
}
