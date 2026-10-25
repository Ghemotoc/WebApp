/**
 * timeAgo: "2 days ago" / "acum 2 zile" for a comment's date (story S1-E6-01; board 3.5).
 *
 * Who calls it: CommentItem. Locale-aware through the browser's Intl.RelativeTimeFormat (DoD:
 * dates use locale-aware formatting), so Romanian and English read naturally with no strings of
 * our own.
 */

/** The steps, largest first: a date is told in the largest unit it has reached. */
const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * Tells how long ago a moment was.
 *
 * @param isoDate - the moment, as the database sends it
 * @param language - the interface language ("ro" or "en")
 * @param now - the time to count from (the current time; a test passes its own)
 * @returns for example "2 days ago", "yesterday", "acum 5 minute"; "now" under a minute
 */
export function timeAgo(isoDate: string, language: string, now: Date = new Date()): string {
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const secondsAgo = Math.max(0, Math.round((now.getTime() - new Date(isoDate).getTime()) / 1000));
  // Step 1: the largest unit the time has reached, rounded down ("3 days", not "2.6").
  for (const [unit, seconds] of units) {
    if (secondsAgo >= seconds) return format.format(-Math.floor(secondsAgo / seconds), unit);
  }
  // Step 2: under a minute.
  return format.format(0, 'second');
}
