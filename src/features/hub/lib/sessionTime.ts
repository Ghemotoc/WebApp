/**
 * The times a live session shows (bundle GAPS-12h; board WritersHub: a date tile "Nov 13" and
 * "Thursday 18:00").
 *
 * A live session happens at one moment for everyone, so it is written on the clock of the device
 * that shows it: a member in Stockholm and one in Bucharest each see their own hour. (Contest
 * days, by contrast, follow the Romanian calendar.)
 * Who calls it: HubSessions, and the staff SessionForm and SessionItem.
 * What it calls: lib/romania-time.ts, only for the locale that goes with a language.
 */
import { dateLocaleFor } from '@/lib/romania-time';

/** A start, cut into the pieces the hub's row draws. */
export interface SessionStartParts {
  /** The short month for the date tile: "Nov". */
  month: string;
  /** The day of the month for the date tile: "13". */
  day: string;
  /** The weekday and the time: "Thursday 18:00". */
  weekdayAndTime: string;
}

/**
 * Cuts a start into the date tile's month and day and the row's weekday and time.
 *
 * @param startsAt - the moment the session starts
 * @param language - the interface language ("ro" or "en")
 * @param timeZone - the clock to write it on; left out, the device's own
 * @returns the three pieces
 */
export function sessionStartParts(
  startsAt: string,
  language: string,
  timeZone?: string,
): SessionStartParts {
  const start = new Date(startsAt);
  const locale = dateLocaleFor(language);
  // Step 1: the date tile.
  const month = new Intl.DateTimeFormat(locale, { timeZone, month: 'short' }).format(start);
  const day = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' }).format(start);
  // Step 2: the weekday with a 24-hour time, the way both languages write a timetable.
  const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(start);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(start);
  // A weekday starts with a capital at the start of a line, in Romanian too.
  const capitalised = weekday.charAt(0).toLocaleUpperCase(locale) + weekday.slice(1);
  return { month: month.replace('.', ''), day, weekdayAndTime: `${capitalised} ${time}` };
}

/**
 * Writes a start the way a "date and time" form field holds it, on the device's clock:
 * "2026-11-13T18:00".
 *
 * @param startsAt - the moment, as the database writes it; empty for a new session
 * @returns the field's value, or an empty text when there is no valid start
 */
export function toDateTimeField(startsAt: string): string {
  const start = new Date(startsAt);
  if (startsAt === '' || Number.isNaN(start.getTime())) return '';
  const twoDigits = (value: number) => String(value).padStart(2, '0');
  const date = `${start.getFullYear()}-${twoDigits(start.getMonth() + 1)}-${twoDigits(start.getDate())}`;
  return `${date}T${twoDigits(start.getHours())}:${twoDigits(start.getMinutes())}`;
}

/**
 * Reads a "date and time" form field, on the device's clock, back into a moment with its time
 * zone, which is what the database stores.
 *
 * @param fieldValue - "2026-11-13T18:00", or an empty text
 * @returns the moment in ISO form, or an empty text when the field is empty or not a date
 */
export function fromDateTimeField(fieldValue: string): string {
  // Only the field's own shape: JavaScript would otherwise guess a date from loose text.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fieldValue)) return '';
  const start = new Date(fieldValue);
  if (Number.isNaN(start.getTime())) return '';
  return start.toISOString();
}
