/**
 * A chapter's blocks and the "spot" a shared link points to (story S1-E4-11).
 *
 * A block is a run of text between blank lines in the chapter's stored Markdown, counted from 1;
 * a line with only spaces or tabs counts as blank, and empty runs are left out. The database cuts
 * the same way (chapter_blocks() in supabase/migrations/…_s1_e4_11_share_passages_and_pictures.sql),
 * so block 3 means the same paragraph on the reader's screen and in the link preview.
 * A spot is the end of a shared address: "p3" for block 3, "p3-5" for blocks 3 to 5, at most
 * five blocks: /s/<story>/<chapter>/p3-5.
 * Who uses it: ChapterText (it numbers the blocks it draws), the chapter reader (it reads the
 * spot), the share bar and the picture Share button (they build it) and server/link-preview.ts.
 */

/** The most blocks one shared passage may hold (get_shared_passage() refuses more). */
export const MAXIMUM_SHARED_BLOCKS = 5;

/** One block of a chapter. */
export interface ChapterBlock {
  /** Its number, from 1. */
  number: number;
  /** Where its text starts in the Markdown (line breaks at its ends skipped). */
  start: number;
  /** Its text, with line breaks at either end trimmed (as the database keeps it). */
  text: string;
}

/** The blocks a spot covers, first and last included. */
export interface SpotRange {
  first: number;
  last: number;
}

/** A blank line: a line break, then only spaces or tabs, then another line break. */
const blankLinePattern = /\n[ \t]*\n/g;

/**
 * Keeps one run of text as a block when it has any words, with its line breaks trimmed.
 *
 * @param blocks - the blocks so far (one is added to it)
 * @param markdown - the whole text
 * @param from - where the run starts
 * @param to - where it ends (not included)
 */
function addBlock(blocks: ChapterBlock[], markdown: string, from: number, to: number) {
  const part = markdown.slice(from, to);
  // Empty runs, or runs of only spaces and line breaks, aren't blocks (as btrim() in SQL).
  if (part.replace(/[ \t\n]/g, '') === '') return;
  const leadingBreaks = part.length - part.replace(/^\n+/, '').length;
  blocks.push({
    number: blocks.length + 1,
    start: from + leadingBreaks,
    text: part.replace(/^\n+|\n+$/g, ''),
  });
}

/**
 * Cuts a chapter into its blocks.
 *
 * @param markdown - the chapter as stored
 * @returns the blocks, in order
 */
export function chapterBlocks(markdown: string): ChapterBlock[] {
  const blocks: ChapterBlock[] = [];
  let runStart = 0;
  // Each blank line ends one run and starts the next, as regexp_split_to_table() does.
  for (const blankLine of markdown.matchAll(blankLinePattern)) {
    addBlock(blocks, markdown, runStart, blankLine.index);
    runStart = blankLine.index + blankLine[0].length;
  }
  addBlock(blocks, markdown, runStart, markdown.length);
  return blocks;
}

/**
 * Which block a place in the Markdown belongs to.
 *
 * @param blocks - chapterBlocks()'s answer
 * @param offset - a place in the Markdown, such as where a drawn paragraph starts
 * @returns the number of the last block starting at or before it (1 before the first)
 */
export function blockNumberAt(blocks: ChapterBlock[], offset: number): number {
  let found = 1;
  for (const block of blocks) {
    if (block.start > offset) break;
    found = block.number;
  }
  return found;
}

/**
 * Reads the spot at the end of a shared address.
 *
 * @param spot - "p3" or "p3-5" (anything else is not a spot)
 * @returns the blocks it covers, or null when it isn't a spot or covers more than five blocks
 */
export function parseSpot(spot: string | undefined): SpotRange | null {
  const match = /^p([1-9]\d{0,4})(?:-([1-9]\d{0,4}))?$/.exec(spot ?? '');
  if (match === null) return null;
  const first = Number(match[1]);
  const last = match[2] === undefined ? first : Number(match[2]);
  if (last < first || last - first >= MAXIMUM_SHARED_BLOCKS) return null;
  return { first, last };
}

/**
 * Writes a spot for an address.
 *
 * @param range - the blocks
 * @returns "p3" for one block, "p3-5" for several
 */
export function spotFor(range: SpotRange): string {
  return range.first === range.last ? `p${range.first}` : `p${range.first}-${range.last}`;
}
