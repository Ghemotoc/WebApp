/**
 * Reads the passage a reader selected in the chapter text, for "Share quote" (story S1-E4-07,
 * first criterion: "a reader selects up to 280 characters").
 *
 * Only a selection that starts and ends inside the protected chapter text counts
 * (ProtectedChapterText marks it with data-protected-text), so the title, the bar or a comment
 * never becomes a quote. Selecting is still allowed there (S1-E4-06a keeps selection on; only
 * copying is off), and the card is drawn by the app, never copied out as text.
 * Since S1-E4-11 it also says which blocks of the chapter the selection covers (the data-block
 * marks ChapterText puts on each top-level part), for "Copy link to this passage".
 * Who calls it: hooks/useQuoteSelection.ts.
 */
import type { SpotRange } from '@/lib/chapter-blocks';

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
  /** The chapter's blocks it covers, or null when they can't be told (S1-E4-11). */
  blocks: SpotRange | null;
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
 * The block the numbered part of the chapter a node sits in starts with.
 *
 * @param node - a selection's start or end
 * @returns the block number, or null outside a numbered part
 */
function blockOf(node: Node | null): number | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  const part = element?.closest('[data-block]');
  if (part === null || part === undefined) return null;
  const block = Number(part.getAttribute('data-block'));
  return Number.isInteger(block) && block > 0 ? block : null;
}

/**
 * The blocks a selection covers, from the part it starts in to the part it ends in. A reader may
 * drag upwards, so the two ends are put in order. A list with blank lines between its items is
 * one part, so a selection inside it points at the list's first block, which highlights the
 * whole list.
 *
 * @param selection - the selection, already known to be in the chapter text
 * @returns the first and last block, or null when either end is outside a numbered part
 */
export function selectedBlocks(selection: Selection): SpotRange | null {
  const anchor = blockOf(selection.anchorNode);
  const focus = blockOf(selection.focusNode);
  if (anchor === null || focus === null) return null;
  return { first: Math.min(anchor, focus), last: Math.max(anchor, focus) };
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
  return { passage, length, fits: length <= longestQuote, blocks: selectedBlocks(selection) };
}
