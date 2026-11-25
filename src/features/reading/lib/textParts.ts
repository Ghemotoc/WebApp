/**
 * Chosen words in the chapter text: from a selection to a quote, and from a quote back to the
 * words on the page (READER-SELECT, boards B12 to B14).
 *
 * Where the numbers come from: every top-level paragraph (a stanza in a poem) is a
 * <p data-block="n"> (lib/numberBlocks.ts). An offset counts characters (UTF-16, as the browser
 * counts them) in that paragraph's text as drawn, from its start, so the same offsets find the
 * same words on every screen. The database keeps them with the words and checks the words
 * (post_passage_comment(), …_reader_select_1_comment_on_chosen_words.sql).
 * Rules from the boards: a selection may cross stanzas and belongs to the stanza it starts in
 * (B14, 7); one that touches the title or the end bar is cut to the chapter text (B14, 8); up to
 * 1,000 characters (B14, 8). Keyboard users choose whole lines, or sentences in prose (B14, 9).
 * Who uses it: the selection bar (components/SelectionComment.tsx), the underlines
 * (components/PartHighlights.tsx) and the line picker (src/features/comments/components/LinePicker.tsx).
 * What it calls: the browser's DOM ranges only.
 */
import type { CommentQuote } from '@/features/comments/api/comments';

/** The most characters a comment's chosen words may have (board B14, 8; the database agrees). */
export const longestChosenWords = 1000;

/** Where some words start and end: the paragraphs and the offsets in them. */
export interface TextSpan {
  block: number;
  endBlock: number;
  startOffset: number;
  endOffset: number;
}

/** What the reader chose: the quote to post, and how many characters it has. */
export interface ChosenWords {
  quote: CommentQuote;
  /** Characters as the reader sees them ("ș" counts once), for the 1,000 limit. */
  length: number;
}

/** One line of a stanza (or one sentence of a paragraph), for the line picker. */
export interface TextLine {
  text: string;
  startOffset: number;
  endOffset: number;
}

/**
 * The paragraph with a given number.
 *
 * @param root - the chapter text (.tmc-chapter-text)
 * @param block - the paragraph's number, from 1
 * @returns the <p>, or null when there is none
 */
export function paragraphOf(root: ParentNode, block: number): HTMLElement | null {
  return root.querySelector<HTMLElement>(`p[data-block="${String(block)}"]`);
}

/**
 * The numbered paragraph a DOM point is in.
 *
 * @param node - any node
 * @returns the <p data-block> and its number, or null outside one
 */
export function numberedParagraphOf(
  node: Node | null,
): { paragraph: HTMLElement; block: number } | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  const paragraph = element?.closest<HTMLElement>('p[data-block]') ?? null;
  if (paragraph === null) return null;
  const block = Number(paragraph.dataset.block);
  return Number.isInteger(block) && block > 0 ? { paragraph, block } : null;
}

/**
 * How many characters of a paragraph's text come before a DOM point.
 *
 * @param paragraph - the <p>
 * @param node - the point's node, inside the paragraph
 * @param offset - the point's offset in that node
 * @returns the character offset from the paragraph's start
 */
export function offsetInParagraph(paragraph: Node, node: Node, offset: number): number {
  const before = document.createRange();
  before.selectNodeContents(paragraph);
  before.setEnd(node, offset);
  return before.toString().length;
}

/**
 * The DOM point a character offset is at inside a paragraph.
 *
 * @param paragraph - the <p>
 * @param offset - characters from its start
 * @returns the text node and the offset in it; past the end, the end of the last text
 */
function pointInParagraph(paragraph: Node, offset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let left = offset;
  let last: Node | null = null;
  // Walk the text pieces until the one the offset falls in.
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (left <= length) return { node, offset: left };
    left -= length;
    last = node;
  }
  if (last === null) return { node: paragraph, offset: 0 };
  return { node: last, offset: last.textContent?.length ?? 0 };
}

/**
 * The words some offsets name, as a DOM range (for the underline and the tint).
 *
 * @param root - the chapter text
 * @param span - the paragraphs and offsets
 * @returns the range, or null when a paragraph isn't on the page
 */
export function rangeOfSpan(root: ParentNode, span: TextSpan): Range | null {
  const first = paragraphOf(root, span.block);
  const last = paragraphOf(root, span.endBlock);
  if (first === null || last === null) return null;
  const start = pointInParagraph(first, span.startOffset);
  const end = pointInParagraph(last, span.endOffset);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

/**
 * The line a piece of text sits on: a poem's line, or its paragraph.
 *
 * @param node - a text node
 * @returns the element that holds its line
 */
function lineOf(node: Node): Element | null {
  const element = node.parentElement;
  return element?.closest('.tmc-poem-line, p[data-block]') ?? null;
}

/**
 * The words inside a range, with a new line between lines and paragraphs (a range's own text
 * runs a poem's lines together: "chest,the knife").
 *
 * @param range - the chosen range
 * @returns the words, each line's spaces tidied
 */
export function wordsInRange(range: Range): string {
  // A selection inside one piece of text (most prose) has that text as its common ancestor, and a
  // walker never returns its own root, so it walks from the element around it.
  const common = range.commonAncestorContainer;
  const root = common.nodeType === Node.TEXT_NODE ? (common.parentNode ?? common) : common;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const lines: string[] = [];
  let currentLine: Element | null = null;
  // Step 1: each text piece inside the range, cut at the range's ends.
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue;
    const text = node.textContent ?? '';
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : text.length;
    // Step 2: a new line starts when the piece is on another line or paragraph.
    const line = lineOf(node);
    if (line !== currentLine || lines.length === 0) lines.push('');
    currentLine = line;
    lines[lines.length - 1] += text.slice(from, to);
  }
  // Step 3: tidy each line's spaces and drop empty lines.
  return lines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * The numbered paragraphs a range touches, first and last.
 *
 * @param root - the chapter text
 * @param range - the selection's range
 * @returns the first and last <p data-block>, or null when it touches none
 */
function paragraphsTouched(root: ParentNode, range: Range): [HTMLElement, HTMLElement] | null {
  const touched = Array.from(root.querySelectorAll<HTMLElement>('p[data-block]')).filter(
    (paragraph) => range.intersectsNode(paragraph),
  );
  const first = touched[0];
  const last = touched[touched.length - 1];
  if (first === undefined || last === undefined) return null;
  return [first, last];
}

/**
 * Cuts a range to the chapter text: a start before the first touched paragraph moves to its start,
 * an end after the last moves to its end (a selection that took in the title or the end bar).
 *
 * @param range - a copy of the selection's range, changed in place
 * @param first - the first paragraph it touches
 * @param last - the last paragraph it touches
 */
function cutToParagraphs(range: Range, first: HTMLElement, last: HTMLElement) {
  if (!first.contains(range.startContainer)) range.setStart(first, 0);
  if (!last.contains(range.endContainer)) range.setEnd(last, last.childNodes.length);
}

/**
 * What the reader selected, as chosen words to comment on.
 *
 * @param selection - the page's selection
 * @param root - the chapter text (.tmc-chapter-text)
 * @returns the quote and its length, or null when nothing in the text is selected
 */
export function chosenWordsOf(selection: Selection | null, root: Element): ChosenWords | null {
  // Step 1: a selection that isn't empty and touches the text.
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0).cloneRange();
  const touched = paragraphsTouched(root, range);
  if (touched === null) return null;
  // Step 2: cut to the chapter text, then read where it starts and ends.
  const [first, last] = touched;
  cutToParagraphs(range, first, last);
  const start = numberedParagraphOf(first);
  const end = numberedParagraphOf(last);
  if (start === null || end === null) return null;
  const startOffset = offsetInParagraph(first, range.startContainer, range.startOffset);
  const endOffset = offsetInParagraph(last, range.endContainer, range.endOffset);
  if (start.block === end.block && endOffset <= startOffset) return null;
  // Step 3: the words, and their length in characters (not UTF-16 units).
  const text = wordsInRange(range);
  if (text === '') return null;
  const quote = { text, startBlock: start.block, startOffset, endBlock: end.block, endOffset };
  return { quote, length: Array.from(text).length };
}

/**
 * Whether a point (paragraph and offset) is inside some words.
 *
 * @param span - the words
 * @param block - the point's paragraph
 * @param offset - the point's offset in it
 * @returns true when the point is in them
 */
export function spanHolds(span: TextSpan, block: number, offset: number): boolean {
  const afterStart = block > span.block || (block === span.block && offset >= span.startOffset);
  const beforeEnd = block < span.endBlock || (block === span.endBlock && offset < span.endOffset);
  return afterStart && beforeEnd;
}

/**
 * The text position under the pointer, where the browser can tell.
 *
 * @param x - the pointer's x, in the window
 * @param y - the pointer's y, in the window
 * @returns the node and offset, or null
 */
export function textPointAt(x: number, y: number): { node: Node; offset: number } | null {
  // Newer browsers have caretPositionFromPoint; Safari and older Chrome caretRangeFromPoint.
  const position = document.caretPositionFromPoint?.(x, y) ?? null;
  if (position !== null) return { node: position.offsetNode, offset: position.offset };
  const range = document.caretRangeFromPoint?.(x, y) ?? null;
  return range === null ? null : { node: range.startContainer, offset: range.startOffset };
}

/**
 * A text's sentences with where each starts and ends, spaces left out.
 *
 * @param text - a paragraph's text
 * @param language - the story's language, for the sentence rules
 * @returns each sentence and its offsets
 */
function sentencesOf(text: string, language: string): TextLine[] {
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' });
  const sentences: TextLine[] = [];
  for (const piece of segmenter.segment(text)) {
    // Leave out the spaces around the sentence, so its offsets hold only its words.
    const leading = piece.segment.length - piece.segment.trimStart().length;
    const words = piece.segment.trim();
    if (words === '') continue;
    const startOffset = piece.index + leading;
    sentences.push({ text: words, startOffset, endOffset: startOffset + words.length });
  }
  return sentences;
}

/**
 * The lines of a stanza, or the sentences of a paragraph, for the line picker (board B14, 9).
 *
 * @param paragraph - the <p>
 * @param isPoem - true for a poem: its lines; otherwise its sentences
 * @param language - the story's language
 * @returns the lines, in order, with their offsets
 */
export function linesOf(paragraph: HTMLElement, isPoem: boolean, language: string): TextLine[] {
  if (!isPoem) return sentencesOf(paragraph.textContent ?? '', language);
  const lines: TextLine[] = [];
  for (const line of Array.from(paragraph.querySelectorAll<HTMLElement>('.tmc-poem-line'))) {
    const text = line.textContent ?? '';
    if (text.trim() === '') continue;
    const startOffset = offsetInParagraph(paragraph, line, 0);
    lines.push({ text: text.trim(), startOffset, endOffset: startOffset + text.length });
  }
  return lines;
}
