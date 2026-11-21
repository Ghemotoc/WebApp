/**
 * The viewer's own local time, for every time of day the app shows or asks for (bundle CALM-8b).
 *
 * Why: Robert, design canvas comment, 20 Nov 2026, 17:49 UTC, on the "comments paused" board:
 * "This should always adapt to the local time of the user who sees it"; and on 20 Nov 2026,
 * 18:19 UTC, asked whether scheduled chapters should follow: "All of them in local time". So a
 * time is shown, and typed, on the clock of the browser looking at it: a reader in London and a
 * writer in Bucharest each see their own hour, with no zone name after it. Rules that count whole
 * days on Romania's calendar (CMS "show from" dates, contest days, age from the year of birth)
 * stay in src/lib/romania-time.ts.
 *
 * Who calls it: the comment pause lines (CommentsPausedLine, CommentComposer, StorySideColumn,
 * CommentPauseField), the Publish panel and the chapter lists (scheduled chapters), the
 * compliance log form and every staff or member screen that shows a date with a time.
 * What it calls: the browser's Intl.DateTimeFormat and Date; dateLocaleFor() for the language's
 * date order.
 */
import { dateLocaleFor, withShortSeptember } from './romania-time';

/**
 * Shows a moment on the viewer's own clock with the weekday, the date and the time after a comma:
 * "Sunday 22 November, 18:40" or "duminică, 22 noiembrie, 18:40".
 *
 * @param instant - the moment
 * @param language - the interface language ("ro" or "en")
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns the text, without a zone name (it is the reader's own time)
 */
export function formatLocalDayAndTime(instant: Date, language: string, timeZone?: string): string {
  // Step 1: the weekday and the date, as the viewer's calendar reads them.
  const day = new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(instant);
  // Step 2: the time on the 24-hour clock, as the viewer's clock reads it.
  const time = new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
  return `${day}, ${time}`;
}

/**
 * Shows a moment on the viewer's own clock: "Saturday 17 October at 18:00" or
 * "sâmbătă, 17 octombrie la 18:00".
 *
 * @param instant - the moment
 * @param language - the interface language ("ro" or "en")
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns the text, without a zone name (it is the reader's own time)
 */
export function formatLocalDateTime(instant: Date, language: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

/** Two digits, for the "YYYY-MM-DD" and "HH:MM" text the date and time fields use. */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** A typed date and time, as numbers: month 1 to 12, hour 0 to 23. */
interface ClockReading {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Says whether a typed date and time names a real moment of the calendar.
 *
 * @param reading - the date and time as typed
 * @returns false for a day the month doesn't have (30 February), a month outside 1 to 12 or a
 *   time past 23:59
 */
function isRealClockReading(reading: ClockReading): boolean {
  // Step 1: the time of day.
  if (reading.hour > 23 || reading.minute > 59) return false;
  // Step 2: the date; Date.UTC rolls 30 February into March, so compare the day it lands on.
  const landed = new Date(Date.UTC(reading.year, reading.month - 1, reading.day));
  return (
    landed.getUTCFullYear() === reading.year &&
    landed.getUTCMonth() === reading.month - 1 &&
    landed.getUTCDate() === reading.day
  );
}

/**
 * Turns a date and time typed on the viewer's own clock into the moment it means.
 *
 * @param date - "YYYY-MM-DD", as an <input type="date"> gives it
 * @param time - "HH:MM", as an <input type="time"> gives it
 * @returns the moment, or null when the text isn't a real date and time (30 February, 24:00)
 * Notes: the browser's Date does the zone maths. On the night the clocks go back, the hour that
 *   happens twice is read as the first one (summer time); on the night they go forward, a time in
 *   the skipped hour moves an hour on.
 */
export function localTimeToInstant(date: string, time: string): Date | null {
  // Step 1: the text must be a date and a time in the shapes the fields give.
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (dateMatch === null || timeMatch === null) return null;
  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])];
  // Step 2: a day that doesn't exist or a time past 23:59 is no moment at all; Date would quietly
  // roll it into the next month or day (QA-5, finding A5).
  if (!isRealClockReading({ year, month, day, hour, minute })) return null;
  // Step 3: the browser reads the numbers on its own clock.
  return new Date(year, month - 1, day, hour, minute);
}

/**
 * Finds a time typed in the hour the clocks skip, so the screen can say when it will really run
 * (DESIGN thread, 20 Nov 2026, 20:09 UTC: a quiet note under the time field).
 *
 * @param date - "YYYY-MM-DD", as an <input type="date"> gives it
 * @param time - "HH:MM", as an <input type="time"> gives it
 * @returns the "HH:MM" it will run at when the typed time doesn't exist on that day (the night
 *   the clocks go forward), or null when the time exists or isn't a real date and time
 * Where it fits: the Publish panel shows the note under its date and time fields.
 */
export function skippedHourRunTime(date: string, time: string): string | null {
  // Step 1: the moment the browser reads for the typed numbers.
  const instant = localTimeToInstant(date, time);
  if (instant === null) return null;
  // Step 2: read it back; on a skipped hour the browser has moved it on, so the fields differ.
  const landed = localFieldsFor(instant);
  if (landed.date === date && landed.time === time) return null;
  return landed.time;
}

/**
 * The fields' values for a moment, on the viewer's own clock.
 *
 * @param instant - the moment
 * @returns { date: "YYYY-MM-DD", time: "HH:MM" }
 */
export function localFieldsFor(instant: Date): { date: string; time: string } {
  return {
    date: `${instant.getFullYear()}-${twoDigits(instant.getMonth() + 1)}-${twoDigits(instant.getDate())}`,
    time: `${twoDigits(instant.getHours())}:${twoDigits(instant.getMinutes())}`,
  };
}

/**
 * The schedule fields' starting values: tomorrow at 18:00 on the writer's own clock.
 *
 * @param now - the current moment
 * @returns { date: "YYYY-MM-DD", time: "18:00" }
 */
export function defaultScheduleFields(now: Date): { date: string; time: string } {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  return { date: localFieldsFor(tomorrow).date, time: '18:00' };
}

/**
 * Shows the day of a moment on the viewer's own calendar: "17 octombrie 2026" or
 * "17 October 2026" (Robert, 20 Nov 2026, 18:36 UTC: dates without a time follow the viewer too).
 *
 * @param instant - the moment (a timestamp from the database)
 * @param language - the interface language
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns the text
 */
export function formatLocalDate(instant: Date, language: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(instant);
}

/**
 * Shows the day of a moment on the viewer's own calendar with the short month: "9 oct. 2026" or
 * "9 Oct 2026" (the reader's meta line, board 3.5, S1-E4-01a).
 *
 * @param instant - the moment (a timestamp from the database)
 * @param language - the interface language
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns the text
 */
export function formatLocalShortDate(instant: Date, language: string, timeZone?: string): string {
  const text = new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(instant);
  return withShortSeptember(text);
}

/**
 * The moment a stored calendar day ("YYYY-MM-DD", an SQL date) is written from: noon UTC on that
 * day. A calendar day has no clock, so it is formatted in UTC and reads the same day for every
 * viewer, east or west of Romania.
 */
function calendarDayMoment(day: string): Date {
  return new Date(`${day.slice(0, 10)}T12:00:00Z`);
}

/**
 * Shows a stored calendar day as it is, with no zone shift: "17 octombrie 2026" or
 * "17 October 2026". For SQL dates (a CMS "show from" date, a deadline day), never timestamps.
 *
 * @param day - "YYYY-MM-DD" (anything after the tenth character is ignored)
 * @param language - the interface language
 * @returns the text
 */
export function formatCalendarDate(day: string, language: string): string {
  return formatLocalDate(calendarDayMoment(day), language, 'UTC');
}

/**
 * Shows a stored calendar day as it is, with the short month: "9 oct. 2026" or "9 Oct 2026".
 *
 * @param day - "YYYY-MM-DD"
 * @param language - the interface language
 * @returns the text
 */
export function formatCalendarShortDate(day: string, language: string): string {
  return formatLocalShortDate(calendarDayMoment(day), language, 'UTC');
}

/** How the day a scheduled chapter comes out is said (CALM-6): the four forms the handover names. */
export type ChapterDayWording =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'weekday'; weekday: string }
  | { kind: 'date'; date: string };

/**
 * A moment's calendar day on the viewer's clock as a whole-day number, so two days subtract.
 *
 * @param instant - any moment
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns days since 1 January 1970 on that calendar
 */
function calendarDayNumber(instant: Date, timeZone?: string): number {
  // en-CA writes the date as YYYY-MM-DD, which Date.parse reads as midnight UTC.
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

/**
 * Says the day a scheduled chapter comes out, for "Next chapter Thursday" and "Last chapter
 * tomorrow" (CALM-6, design handover "The last chapter"): "today", "tomorrow", the weekday for 2
 * to 6 days ahead or the date from 7 days ("27 November"). Counted on the viewer's own calendar:
 * the handover said Romania time, but Robert's later rule for scheduled chapters is "All of them
 * in local time" (20 Nov 2026, 18:19 UTC).
 *
 * @param scheduledFor - when the chapter goes out
 * @param now - the moment to count from (the page passes new Date())
 * @param language - the interface language ("ro" or "en")
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns the wording; a time already past counts as today
 */
export function chapterDayWording(
  scheduledFor: Date,
  now: Date,
  language: string,
  timeZone?: string,
): ChapterDayWording {
  // Step 1: how many of the viewer's days ahead it is.
  const daysAhead = calendarDayNumber(scheduledFor, timeZone) - calendarDayNumber(now, timeZone);
  if (daysAhead <= 0) return { kind: 'today' };
  if (daysAhead === 1) return { kind: 'tomorrow' };
  // Step 2: within the week, the weekday's name.
  const locale = dateLocaleFor(language);
  if (daysAhead < 7) {
    const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(
      scheduledFor,
    );
    return { kind: 'weekday', weekday };
  }
  // Step 3: further ahead, the day and the month.
  const date = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric', month: 'long' }).format(
    scheduledFor,
  );
  return { kind: 'date', date };
}
