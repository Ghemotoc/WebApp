/**
 * How a class assignment's due date reads: "Friday 14 Nov" (bundle MUST-1, part d;
 * IDEA-20261108-8).
 *
 * The database keeps the day only (forum_threads.due_on, a date in the Romanian calendar), so it
 * is formatted as that calendar day, never shifted by the reader's time zone.
 * Who calls it: ThreadHeader, ClassAssignmentsCard and the reminder's notification text.
 * What it calls: the browser's Intl.DateTimeFormat.
 */

/**
 * Formats a due day.
 *
 * @param dueOn - the day as the database gives it ("2026-11-14")
 * @param language - the interface language ("en", "ro")
 * @returns "Friday 14 Nov" in English, "vineri, 14 nov." in Romanian
 */
export function dueDayText(dueOn: string, language: string): string {
  // Step 1: read the day at midnight UTC and format it in UTC, so no time zone moves it.
  const day = new Date(`${dueOn}T00:00:00Z`);
  // Step 2: the weekday spelled out, the day and the short month, as the idea asks. English
  // reads it the British way, day before month ("Friday 14 Nov"), as the rest of the copy does.
  const locale = language === 'en' ? 'en-GB' : language;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(day);
}
