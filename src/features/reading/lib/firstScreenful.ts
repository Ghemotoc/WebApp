/**
 * firstScreenful: the opening blocks of a chapter, for the reader's first draw (the reader speed
 * check, 25 Nov 2026; S1-E4-01's criterion "readable within 2 seconds on a mid-range phone on 4G").
 *
 * The reader draws these first and the whole text one frame after the first paint, because reading
 * all of a long chapter's Markdown before anything shows held the first paragraph back by about
 * 280 ms on a slow phone. The cut is made where a block starts (a blank line, as
 * lib/chapter-blocks.ts splits them), so the blocks drawn first keep the numbers they have in the
 * whole text: a shared spot, a paragraph's comments and a saved place still point at the same
 * paragraph.
 * Who calls it: ChapterText (components/ChapterText.tsx). What it calls: chapterBlocks().
 */
import { chapterBlocks } from '@/lib/chapter-blocks';

/**
 * The Markdown of a chapter's first blocks.
 *
 * @param markdown - the chapter body as stored
 * @param blockCount - how many blocks to keep (1 or more)
 * @returns the text up to where block blockCount + 1 starts, or the whole text when it has no more
 *   blocks than that
 */
export function firstScreenful(markdown: string, blockCount: number): string {
  // Step 1: split the text into its blocks, as the database numbers them.
  const blocks = chapterBlocks(markdown);
  // Step 2: a short text is drawn whole at once.
  const firstLeftOut = blocks[Math.max(1, Math.floor(blockCount))];
  if (firstLeftOut === undefined) return markdown;
  // Step 3: cut where the first block left out begins.
  return markdown.slice(0, firstLeftOut.start);
}
