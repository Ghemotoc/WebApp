/**
 * learningPath: small rules for showing the learning path (bundle GAPS-12g).
 *
 * Who calls it: HubPath (which day "Continue" opens) and LearningPathPage (which day the address
 * asks for, and a lesson's paragraphs).
 */

/**
 * The first day not yet done, which "Continue day N" opens.
 *
 * @param steps - the days in order, each with whether it is done
 * @returns the day's number, or null when every day is done (or there are none)
 */
export function nextOpenDay(steps: { day: number; isDone: boolean }[]): number | null {
  const open = steps.find((step) => !step.isDone);
  return open === undefined ? null : open.day;
}

/**
 * Reads the day the address asks for ("?day=3").
 *
 * @param value - the address parameter, or null when it is missing
 * @param dayCount - how many days the path has
 * @returns the day's number, or null when the value isn't a whole day of the path
 */
export function dayFromAddress(value: string | null, dayCount: number): number | null {
  if (value === null || !/^\d{1,2}$/.test(value)) return null;
  const day = Number(value);
  return day >= 1 && day <= dayCount ? day : null;
}

/**
 * Splits a lesson into its paragraphs: staff leave a blank line between them.
 *
 * @param lesson - the lesson's plain text
 * @returns the paragraphs, trimmed, without empty ones
 */
export function lessonParagraphs(lesson: string): string[] {
  return lesson
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}
