/**
 * Romania time (Europe/Bucharest) for scheduled chapters and the dates readers see
 * (story S1-E3-03; decided 23 Oct 2026, Q7: everyone schedules in Romania time in March).
 *
 * Why it needs care: Romania moves its clocks twice a year (the last Sunday of March and of
 * October), so "18:00 Romania time" is 15:00 or 16:00 UTC depending on the date. The browser's
 * own time zone may be anything (a writer abroad), so the conversion never uses it: it asks the
 * Intl API what the clock reads in Bucharest at a given moment and corrects until it matches.
 * Who calls it: PublishPanel (the date and time fields, the "Scheduled for" line), the story
 * page's chapter dates, Manage chapters and the reader.
 * English dates are written the British way ("5 Sep 2026", "Saturday 17 October at 18:00"):
 * Robert writes British English (CTO, 24 Oct 2026). dateLocaleFor() is the one place that says so.
 */

/** The zone every scheduled time is entered in (Q7). */
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

/** A clock reading: the date and time as a wall clock shows them. */
interface ClockReading {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Minutes since the epoch for a clock reading, as if it were UTC (for comparing two readings). */
function wallClockMinutes(reading: ClockReading): number {
  return (
    Date.UTC(reading.year, reading.month - 1, reading.day, reading.hour, reading.minute) / 60_000
  );
}

/**
 * Turns a date and time typed as Romania time into the moment it means.
 *
 * @param date - "YYYY-MM-DD", as an <input type="date"> gives it
 * @param time - "HH:MM", as an <input type="time"> gives it
 * @returns the moment, or null when the text isn't a date and time
 * Notes: on the night the clocks go back, 03:00–03:59 happens twice; the first (summer time) is
 *   used. On the night they go forward, 03:00–03:59 never happens; the time is moved an hour on.
 */
export function romaniaTimeToInstant(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (dateMatch === null || timeMatch === null) return null;
  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])];
  const wanted = wallClockMinutes({ year, month, day, hour, minute });
  // Step 1: start from Romania's summer offset (UTC+3), the earlier of the two readings.
  let guess = new Date((wanted - 180) * 60_000);
  // Step 2: see what Bucharest's clock says at the guess and move by the difference (twice is
  // enough: the offset is either +2 or +3).
  const tried: number[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const shown = bucharestParts(guess);
    const difference = wanted - wallClockMinutes(shown);
    if (difference === 0) return guess;
    tried.push(guess.getTime());
    guess = new Date(guess.getTime() + difference * 60_000);
  }
  // Step 3: a time that doesn't exist (the hour skipped in March) never matches; the guesses
  // jump either side of it, and the later one is the same clock time an hour on.
  return new Date(Math.max(...tried, guess.getTime()));
}

/**
 * The date and time fields' starting values: tomorrow at 18:00 Romania time.
 *
 * @param now - the current moment
 * @returns { date: "YYYY-MM-DD", time: "18:00" }
 */
export function defaultScheduleFields(now: Date): { date: string; time: string } {
  const tomorrow = bucharestParts(new Date(now.getTime() + 24 * 60 * 60_000));
  const pad = (value: number) => String(value).padStart(2, '0');
  return { date: `${tomorrow.year}-${pad(tomorrow.month)}-${pad(tomorrow.day)}`, time: '18:00' };
}

/**
 * The date and time fields for "now", Romania time: what a form that logs something that just
 * happened starts with (S1-E11-04, the compliance log).
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
 * Shows a moment as Romania time in the interface language: "sâmbătă, 17 octombrie la 18:00" or
 * "Saturday 17 October at 18:00".
 *
 * @param instant - the moment
 * @param language - the interface language ("ro" or "en")
 * @returns the text, without the zone's name (the screen adds "Romania time")
 */
export function formatRomaniaDateTime(instant: Date, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: ROMANIA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
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
