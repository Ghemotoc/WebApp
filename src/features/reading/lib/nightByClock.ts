/**
 * Night by the clock: which paper a chapter opens on (bundle IDEAS-1, part a; idea
 * IDEA-20261031-7, Robert, 31 Oct 2026: "there is no fixed or preset hour: the reader sets both";
 * Black paper since BOOKS B04, where the Paper replaced the Night theme).
 *
 * The rule:
 * - while Night by the clock is on and both times are set, a chapter opened between them, on the
 *   device's own clock, shows on Black paper; a span whose end is earlier than its start runs past
 *   midnight (22:30 to 06:00);
 * - a paper the reader picks by hand in the open chapter wins until they open the next chapter;
 * - otherwise the reader's usual paper.
 * Only the device's clock is read, and nothing about it is sent anywhere.
 * Who calls it: hooks/useChapterPaper.ts. What it calls: nothing; tested in nightByClock.test.ts.
 */
import type { ReadingPaper, ReadingSettings } from '../api/readingSettings';

/**
 * Minutes since midnight for "HH:MM".
 *
 * @param time - a time as a time field gives it
 * @returns 0 to 1439, or null when the text isn't a time
 */
export function minutesOf(time: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Whether a moment falls inside the reader's night hours.
 *
 * @param now - the device's time
 * @param nightFrom - when the hours start, "HH:MM", or null
 * @param nightUntil - when they end, "HH:MM", or null
 * @returns true inside the hours; false when either time is missing or both are the same
 */
export function isInsideNightHours(
  now: Date,
  nightFrom: string | null,
  nightUntil: string | null,
): boolean {
  // Step 1: both times, as minutes since midnight; nothing applies until both are set.
  if (nightFrom === null || nightUntil === null) return false;
  const start = minutesOf(nightFrom);
  const end = minutesOf(nightUntil);
  if (start === null || end === null || start === end) return false;
  // Step 2: the device's own time of day.
  const current = now.getHours() * 60 + now.getMinutes();
  // Step 3: a span on one day, or one that runs past midnight.
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

/**
 * Whether Night by the clock is turning this chapter's paper to Black.
 *
 * @param settings - the reader's settings
 * @param openedAt - when the chapter was opened, on the device's clock
 * @returns true when the clock decides the paper
 */
export function isNightByClockNow(settings: ReadingSettings, openedAt: Date): boolean {
  if (!settings.nightByClock) return false;
  return isInsideNightHours(openedAt, settings.nightFrom, settings.nightUntil);
}

/**
 * The paper the open chapter shows.
 *
 * @param settings - the reader's settings
 * @param openedAt - when the chapter was opened
 * @param pickedByHand - a paper picked by hand in this chapter, or null
 * @returns the paper
 */
export function chapterPaper(
  settings: ReadingSettings,
  openedAt: Date,
  pickedByHand: ReadingPaper | null,
): ReadingPaper {
  // Step 1: a pick by hand in this chapter wins until the next chapter.
  if (pickedByHand !== null) return pickedByHand;
  // Step 2: inside the reader's night hours the paper is Black.
  if (isNightByClockNow(settings, openedAt)) return 'black';
  // Step 3: otherwise the reader's usual paper.
  return settings.paper;
}
