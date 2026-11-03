/**
 * The kind-words check: does a comment contain a phrase from the nudge lists? (bundle ADMIN-2,
 * part d3; Robert, 2 Nov 2026, 22:10: "a gentle nudge, can still send").
 *
 * It runs only in the commenter's own browser, just before sending. A match never blocks anything:
 * the composer asks "Still want to send this?" and the person decides. Nothing about the check is
 * stored, logged or sent, so CLAUDE.md rule 19 (no automated text moderation) holds.
 * Who calls it: hooks/useKindWordsNudge.ts. What it calls: nothing; plain string work.
 */

/**
 * Text in the form the check compares: lower case, without accents (so "proastă", "proasta" and
 * "proastă" with a cedilla all match), with curly apostrophes made straight.
 *
 * @param text - any text
 * @returns the folded text
 */
export function foldForKindWords(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[‘’]/g, "'").toLowerCase();
}

/** Characters with a meaning in a regular expression, escaped so a phrase matches as written. */
function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The pattern for one phrase: whole words only ("idiot" matches "you idiot!" but not
 * "idiotproof"), with any run of spaces between its words.
 *
 * @param phrase - a phrase from the list
 * @returns the pattern, or null for a phrase with no letters or digits
 */
function patternFor(phrase: string): RegExp | null {
  const words = foldForKindWords(phrase).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const body = words.map(escapeForPattern).join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'u');
}

/**
 * Whether a comment contains any phrase from the lists.
 *
 * @param comment - the text as typed
 * @param phrases - the phrases from both lists (a Romanian reader may still type English)
 * @returns true when at least one phrase is there as whole words
 */
export function hasUnkindWords(comment: string, phrases: readonly string[]): boolean {
  const folded = foldForKindWords(comment);
  return phrases.some((phrase) => patternFor(phrase)?.test(folded) === true);
}
