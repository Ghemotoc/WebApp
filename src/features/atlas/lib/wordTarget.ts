/**
 * Reads the word target a writer types (story S1-E17-03). The database takes a whole number from
 * 1 to 5,000,000 (story_plans_word_target_range), so the screen checks the same before it saves.
 *
 * Who calls it: WordTargetField.
 */

/** The largest target the database takes. */
const largestWordTarget = 5_000_000;

/**
 * Reads a typed target. Spaces, dots and commas between digits are allowed, so "90 000",
 * "90.000" (Romanian) and "90,000" (English) all read as 90000.
 *
 * @param typed - what is in the box
 * @returns the number, or null when it isn't a whole number in range
 */
export function wordTargetFrom(typed: string): number | null {
  const digitsOnly = typed.replace(/[\s.,]/g, '');
  if (!/^\d+$/.test(digitsOnly)) return null;
  const target = Number(digitsOnly);
  if (target < 1 || target > largestWordTarget) return null;
  return target;
}
