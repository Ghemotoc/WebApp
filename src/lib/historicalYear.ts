/**
 * Years before Christ for classics (bundle BC-YEARS; CONTENT thread, 27 Nov 2026).
 *
 * The database keeps a year before Christ as a negative number: 428 BC is -428, and there is no
 * year 0 (migration 20270205100824_bcyears_years_before_christ.sql). This file turns such a year
 * into words for people ("428 BC", "428 î.Hr." through the common namespace's
 * `yearBeforeChrist` key) and keeps what staff type in a year field to digits with an optional
 * leading minus.
 * Who uses it: the story page (StoryLabels, StorySideColumn) and the staff Classics screens.
 * What it calls: nothing; the caller passes its translate function.
 */

/** A translate function that can read the common namespace's `yearBeforeChrist` key. */
type Translate = (key: string, options: { year: number }) => string;

/**
 * A year as people read it: "1892" after Christ, "428 BC" before.
 *
 * @param year - the year, negative before Christ
 * @param translate - i18next's t, for the words of the reader's language
 * @returns the year in words
 */
export function historicalYear(year: number, translate: Translate): string {
  // A year after Christ is written as it is; one before takes the word after it.
  if (year > 0) return String(year);
  return translate('common:yearBeforeChrist', { year: -year });
}

/**
 * What a staff year field keeps of what was typed: digits, with one minus allowed at the start
 * for a year before Christ ("-428").
 *
 * @param typed - the field's text
 * @returns the cleaned text
 */
export function yearFieldText(typed: string): string {
  // Step 1: a minus counts only as the first character.
  const beforeChrist = typed.trimStart().startsWith('-');
  // Step 2: everything else that isn't a digit goes.
  const digits = typed.replace(/\D/g, '');
  return beforeChrist ? `-${digits}` : digits;
}

/**
 * The year a staff year field holds, or null while it holds no digits yet ("" or "-").
 *
 * @param text - the cleaned field text
 * @returns the year, negative before Christ, or null
 */
export function yearFromField(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '' || trimmed === '-') return null;
  return Number(trimmed);
}
