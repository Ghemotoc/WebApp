/**
 * optionalNumbers: reads the number boxes of a chapter's plan (story S1-E17-24), where an empty
 * box means "none".
 *
 * Who calls it: ChapterPlanSetting (the word target and the in-world sort value).
 */

/** What a typed box holds: a number, nothing (empty), or something that isn't a number. */
export type TypedNumber = { isValid: true; value: number | null } | { isValid: false };

/** The largest chapter target the database takes (chapter_plans_word_target_range). */
const largestChapterTarget = 1_000_000;

/**
 * Reads a chapter's word target: empty for none, otherwise a whole number from 1 to 1,000,000.
 * Spaces, dots and commas between digits are dropped, so "3,000" and "3 000" both work.
 *
 * @param typed - what the writer typed
 * @returns the target, null for none, or not valid
 */
export function chapterTargetFrom(typed: string): TypedNumber {
  // Step 1: an empty box clears the target.
  if (typed.trim() === '') return { isValid: true, value: null };
  // Step 2: only digits are left once separators go.
  const digitsOnly = typed.replace(/[\s.,]/g, '');
  if (!/^\d+$/.test(digitsOnly)) return { isValid: false };
  // Step 3: inside the database's range.
  const target = Number(digitsOnly);
  if (target < 1 || target > largestChapterTarget) return { isValid: false };
  return { isValid: true, value: target };
}

/**
 * Reads an in-world sort value: empty for none, otherwise any number ("3", "-12", "3.5"; a comma
 * works as the decimal mark, as Romanian writes it).
 *
 * @param typed - what the writer typed
 * @returns the number, null for none, or not valid
 */
export function sortValueFrom(typed: string): TypedNumber {
  const trimmed = typed.trim();
  if (trimmed === '') return { isValid: true, value: null };
  const withDot = trimmed.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(withDot)) return { isValid: false };
  return { isValid: true, value: Number(withDot) };
}
