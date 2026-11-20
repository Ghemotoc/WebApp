/**
 * Romania's calendar (Europe/Bucharest) for days the app counts as rules (story S1-E3-03;
 * decided 23 Oct 2026, Q7), and the date format every screen shares.
 *
 * Nothing shown is here: every time and date the app shows or asks for is on the viewer's own
 * clock (Robert, 20 Nov 2026, 18:19 UTC: "All of them in local time"; 18:36 UTC: dates without a
 * time too; src/lib/local-time.ts). What stays is "today" on Romania's calendar, for the rules
 * that count whole days there (contest, hub and data request deadlines), plus dateLocaleFor()
 * and withShortSeptember(), which local-time.ts uses for the language's date order.
 * Who calls it: the hub, contests, data requests and src/lib/local-time.ts.
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
