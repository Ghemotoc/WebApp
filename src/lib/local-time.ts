/**
 * The viewer's own local time, for moments a member reads but never types (bundle CALM-8b).
 *
 * Why (Robert, design canvas comment, 20 Nov 2026, 17:49 UTC, on the "comments paused" board:
 * "This should always adapt to the local time of the user who sees it"): when a pause of new
 * comments ends is shown in the time zone of the browser looking at it, so a reader in London and
 * a writer in Bucharest each see the end on their own clock, with no zone name after it. Dates a
 * writer types (scheduled chapters) stay in Romania time (src/lib/romania-time.ts, Q7).
 *
 * Who calls it: CommentsPausedLine, CommentComposer, StorySideColumn and CommentPauseField, which
 * put the text into their "paused until {{when}}" sentences.
 * What it calls: the browser's Intl.DateTimeFormat; dateLocaleFor() for the language's date order.
 */
import { dateLocaleFor } from './romania-time';

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
