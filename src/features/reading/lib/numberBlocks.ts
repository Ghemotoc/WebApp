/**
 * numberBlocks: a rehype step that marks each top-level part of a drawn chapter with the blocks
 * it holds, and highlights a shared passage (story S1-E4-11).
 *
 * Each paragraph, heading, quote, list, scene break or picture at the top of the chapter gets
 * data-block (its first block) and data-block-end (its last: a list with blank lines between its
 * items holds several). The share bar and the picture Share button read them to build a spot
 * link; the reader opened at a spot finds the passage by them. The numbers come from
 * src/lib/chapter-blocks.ts, which cuts the text as the database does, so the link preview
 * shows the same passage.
 * A highlighted part gets the class tmc-shared-passage (src/styles/index.css); the first one also
 * gets data-shared-start and tabIndex -1, so the reader can move focus there.
 * Who uses it: ChapterText, as a rehype plugin.
 */
import type { Element, Root } from 'hast';

import { blockNumberAt, type ChapterBlock, type SpotRange } from '@/lib/chapter-blocks';

/** What the step needs. */
export interface NumberBlocksOptions {
  /** chapterBlocks() of the text being drawn. */
  blocks: ChapterBlock[];
  /** The shared passage to highlight, or null. */
  highlight: SpotRange | null;
}

/**
 * The block a drawn part starts in.
 *
 * @param element - a top-level part
 * @param blocks - the text's blocks
 * @returns its block number
 */
function firstBlockOf(element: Element, blocks: ChapterBlock[]): number {
  return blockNumberAt(blocks, element.position?.start.offset ?? 0);
}

/**
 * Marks one part as highlighted.
 *
 * @param element - the part
 * @param isFirst - true for the first highlighted part, which takes focus
 */
function highlightPart(element: Element, isFirst: boolean) {
  const current = element.properties.className;
  const classes = Array.isArray(current) ? current.map(String) : [];
  element.properties.className = [...classes, 'tmc-shared-passage'];
  if (isFirst) {
    element.properties.dataSharedStart = '';
    element.properties.tabIndex = -1;
  }
}

/**
 * Builds the step.
 *
 * @param options - the blocks and the passage to highlight
 * @returns the transformer react-markdown runs on the drawn tree
 */
export function numberBlocks(options: NumberBlocksOptions) {
  return (tree: Root) => {
    const parts = tree.children.filter((child): child is Element => child.type === 'element');
    const lastBlock = options.blocks.length;
    let hasHighlighted = false;
    parts.forEach((part, index) => {
      // Step 1: the part's first block, and its last: just before the next part's first.
      const first = firstBlockOf(part, options.blocks);
      const next = parts[index + 1];
      const nextFirst = next === undefined ? lastBlock + 1 : firstBlockOf(next, options.blocks);
      const last = Math.max(first, nextFirst - 1);
      part.properties.dataBlock = first;
      part.properties.dataBlockEnd = last;
      // Step 2: highlight it when it overlaps the shared passage.
      const range = options.highlight;
      if (range !== null && first <= range.last && last >= range.first) {
        highlightPart(part, !hasHighlighted);
        hasHighlighted = true;
      }
    });
  };
}
