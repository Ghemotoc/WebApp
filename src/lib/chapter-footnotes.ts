/**
 * How a footnote is written inside a chapter's stored text (BOOKS-D05b; boards D13-EditorFootnotes
 * and B15-ReaderFootnotes; the Markdown subset of CLAUDE.md rule 8, ADR 0005).
 *
 * A footnote is an inline link whose address is "footnote:" and whose words are the note, written
 * where its number sits in the text: `painted green again[The lifts are painted every spring.](footnote:),`.
 * The note travels with its sentence, so moving or cutting a paragraph keeps its notes, the teaser
 * cut (whole paragraphs) never leaves a number without its note, and translations keep the note in
 * the paragraph it explains. The numbers are never stored: they are the notes' order in the text.
 * A note is plain text on one line, at most 600 characters (board D13: "45 of 600"); its Markdown
 * characters are backslash-escaped like any other text, so a note can't hold a link or formatting.
 * The database knows the form too: count_words() leaves footnotes out (board D13, "notes not
 * counted"; supabase/migrations/…_books_d05b_footnotes.sql), and has_unsafe_link() accepts the
 * address because it isn't javascript:, data: or vbscript:.
 *
 * Who uses it: the editor's converters (src/features/writing/lib/chapterMarkdown.ts), the reader
 * (ChapterText and its numberFootnotes step), the chapter schema (src/schemas/chapter.ts) and the
 * Word, PDF and EPUB builders (src/lib/word/, src/lib/pdf/, src/lib/epub/). What it calls: nothing
 * outside this file except unist-util-visit.
 */
import type { FootnoteReference, Nodes as MarkdownNode, Root } from 'mdast';
import { visit } from 'unist-util-visit';

/** A footnote's address in the text. */
export const FOOTNOTE_ADDRESS = 'footnote:';

/** The longest note, in characters (board D13: "45 of 600"). */
export const MAXIMUM_FOOTNOTE_LENGTH = 600;

/** What follows a footnote's closing bracket in the text. */
const FOOTNOTE_ENDING = `](${FOOTNOTE_ADDRESS})`;

/**
 * Whether an address is a footnote's.
 *
 * @param address - a link's address from the Markdown
 * @returns true only for exactly "footnote:"
 */
export function isFootnoteAddress(address: string): boolean {
  return address === FOOTNOTE_ADDRESS;
}

/**
 * A note as it is kept: on one line (line breaks and runs of spaces become one space), trimmed.
 *
 * @param text - the note as typed
 * @returns the note on one line
 */
export function oneLineNote(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Where the bracket that opens at `start` closes, skipping backslash-escaped characters.
 *
 * @param markdown - the text
 * @param start - the place of the "["
 * @returns the place of the matching "]", or -1 when the line ends first
 */
function closingBracketAfter(markdown: string, start: number): number {
  for (let place = start + 1; place < markdown.length; place += 1) {
    const character = markdown[place];
    // Step 1: an escaped character ("\]") is text, never the end.
    if (character === '\\') {
      place += 1;
      continue;
    }
    // Step 2: a note is on one line, so a line break means this bracket is not a note.
    if (character === '\n') return -1;
    if (character === ']') return place;
  }
  return -1;
}

/**
 * Every note in a stored text, in order, read straight from the Markdown (no parsing, so the
 * reader can list the notes without reading the whole chapter again; the reader speed check,
 * 25 Nov 2026).
 *
 * @param markdown - the chapter as stored
 * @returns the notes' words, with Markdown's backslash escapes taken out
 */
export function footnotesIn(markdown: string): string[] {
  const notes: string[] = [];
  let place = 0;
  while (place < markdown.length) {
    const character = markdown[place];
    // Step 1: an escaped character is plain text ("\[" never opens a note).
    if (character === '\\') {
      place += 2;
      continue;
    }
    // Step 2: a "[" opens a note only when its "]" is followed by "(footnote:)".
    if (character === '[') {
      const closing = closingBracketAfter(markdown, place);
      if (closing !== -1 && markdown.startsWith(FOOTNOTE_ENDING, closing)) {
        notes.push(markdown.slice(place + 1, closing).replace(/\\(.)/g, '$1'));
        place = closing + FOOTNOTE_ENDING.length;
        continue;
      }
    }
    place += 1;
  }
  return notes;
}

/**
 * The words of a parsed Markdown node, flattened.
 *
 * @param node - the node
 * @returns its text
 */
function wordsOf(node: MarkdownNode): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return node.children.map((child) => wordsOf(child)).join('');
  return '';
}

/**
 * Turns every footnote link in a parsed chapter into Markdown's own footnote reference and gives
 * back the notes. The Word, PDF and EPUB builders call it first, then draw a footnoteReference as
 * the small raised number (board D13, "Word export").
 *
 * @param tree - the chapter, parsed with mdast-util-from-markdown (changed in place)
 * @param numberFor - the number a note's reference carries, given the note and its order in the
 *   chapter from 1; left out, the order itself. Word numbers notes across the whole file, so its
 *   builder passes the file's own count.
 * @returns the notes' words, in order: the chapter's first note first
 */
export function takeFootnotes(
  tree: Root,
  numberFor: (note: string, order: number) => number = (_note, order) => order,
): string[] {
  const notes: string[] = [];
  visit(tree, 'link', (node, index, parent) => {
    // Step 1: only a footnote's link is taken; every other link stays as it is.
    if (!isFootnoteAddress(node.url) || parent === undefined || index === undefined) return;
    // Step 2: the note's words are kept, and its place gets the reference with its number.
    const note = oneLineNote(wordsOf(node));
    notes.push(note);
    const number = String(numberFor(note, notes.length));
    const reference: FootnoteReference = {
      type: 'footnoteReference',
      identifier: number,
      label: number,
    };
    parent.children.splice(index, 1, reference);
  });
  return notes;
}
