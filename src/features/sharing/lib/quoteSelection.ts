/**
 * Reads the passage a reader selected in the chapter text, for "Share quote" (story S1-E4-07,
 * first criterion: "a reader selects up to 280 characters").
 *
 * Only a selection that starts and ends inside the protected chapter text counts
 * (ProtectedChapterText marks it with data-protected-text), so the title, the bar or a comment
 * never becomes a quote. Selecting is still allowed there (S1-E4-06a keeps selection on; only
 * copying is off), and the card is drawn by the app, never copied out as text.
 * Who calls it: hooks/useQuoteSelection.ts.
 */

/** The longest passage a quote card takes (S1-E4-07). */
export const longestQuote = 280;

/** What the reader has selected in the chapter text. */
export interface QuoteSelection {
  /** The passage, with runs of spaces and line breaks made single spaces. */
  passage: string;
  /** Its length in characters (as the reader sees them, so "ș" counts once). */
  length: number;
  /** True when it fits on a card (1 to 280 characters). */
  fits: boolean;
}

/**
 * Whether a node sits inside the chapter text.
 *
 * @param node - a selection's start or end
 * @returns true inside [data-protected-text]
 */
function isInChapterText(node: Node | null): boolean {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return element !== null && element.closest('[data-protected-text]') !== null;
}

/**
 * Tidies a selected passage: single spaces, no space at either end.
 *
 * @param text - the selection's text
 * @returns the passage
 */
export function tidyPassage(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Reads the current selection.
 *
 * @param selection - the document's selection (window.getSelection())
 * @returns the passage and whether it fits, or null when nothing in the chapter text is selected
 */
export function readQuoteSelection(selection: Selection | null): QuoteSelection | null {
  // Step 1: something selected, starting and ending in the chapter text.
  if (selection === null || selection.isCollapsed) return null;
  if (!isInChapterText(selection.anchorNode) || !isInChapterText(selection.focusNode)) return null;
  // Step 2: the passage and its length in characters, not UTF-16 units.
  const passage = tidyPassage(selection.toString());
  if (passage === '') return null;
  const length = Array.from(passage).length;
  return { passage, length, fits: length <= longestQuote };
}
