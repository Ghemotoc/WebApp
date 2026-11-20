/**
 * Romania's calendar (Europe/Bucharest) for days the app counts as rules, and the dates (without
 * a time) readers see (story S1-E3-03; decided 23 Oct 2026, Q7).
 *
 * Times of day are not here: every time the app shows or asks for is on the viewer's own clock
 * (Robert, 20 Nov 2026, 18:19 UTC: "All of them in local time"; src/lib/local-time.ts). What stays
 * is the calendar day in Romania: "today" for contest, hub and data request deadlines, and the
 * date-only lines (published on, joined in), which read a moment's day the way Bucharest does.
 * Who calls it: the story page's chapter dates, the reader's meta line, the hub, contests, data
 * requests and the staff metrics.
 * English dates are written the British way ("5 Sep 2026", "Saturday 17 October at 18:00"):
 * Robert writes British English (CTO, 24 Oct 2026). dateLocaleFor() is the one place that says so.
 */

/** Romania's zone, whose calendar days the rules count in (Q7). */
export const ROMANIA_TIME_ZONE = 'Europe/Bucharest';

/**
 * The locale to format dates and times with: British English for the English interface, the
 * interface language otherwise.
 *
 * @param language - the interface language ("ro" or "en")
 * @returns for example "en-GB" or "ro"
 */
export function dateLocaleFor(language: string): string {
  return language === 'en' ? 'en-GB' : language;
}

/**
 * Writes September's short form as "Sep", like the other short months: the British English data
 * in today's browsers says "Sept", which reads oddly next to "Oct" and "Nov".
 *
 * @param text - a formatted date
 * @returns the same date with "Sept" as "Sep"
 */
export function withShortSeptember(text: string): string {
  return text.replace(/\bSept\b/, 'Sep');
}

/** The parts of a moment as the Bucharest clock shows them. */
function bucharestParts(instant: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROMANIA_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

/**
 * Today's date (and the time) on Romania's clock: the day contest, hub and data request rules
 * compare their dates with (the compliance log's fields use the viewer's clock instead,
 * localFieldsFor() in src/lib/local-time.ts).
 *
 * @param now - the current moment
 * @returns { date: "YYYY-MM-DD", time: "HH:MM" }
 */
export function romaniaNowFields(now: Date): { date: string; time: string } {
  const parts = bucharestParts(now);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  };
}

/**
 * Shows a date as Romania sees it: "17 octombrie 2026" or "17 October 2026".
 *
 * @param instant - the moment
 * @param language - the interface language
 * @returns the text
 */
export function formatRomaniaDate(instant: Date, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: ROMANIA_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(instant);
}

/**
 * Shows a date as Romania sees it, with the short month: "9 oct. 2026" or "9 Oct 2026" (the
 * reader's meta line, board 3.5, S1-E4-01a).
 *
 * @param instant - the moment
 * @param language - the interface language
 * @returns the text
 */
export function formatRomaniaShortDate(instant: Date, language: string): string {
  const text = new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: ROMANIA_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(instant);
  return withShortSeptember(text);
}
