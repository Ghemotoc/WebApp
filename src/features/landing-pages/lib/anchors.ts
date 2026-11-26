/**
 * anchors: the id a landing page block carries on the page, so a link can jump to it (BOOKS-A10:
 * the hero's "How it works" jumps to the Steps block, board A10).
 *
 * Who calls it: LandingHero (the link) and BuilderBlocks (the Steps section's id).
 * What it calls: nothing.
 */
import type { LandingBlock } from '@/schemas/landingPages';

/**
 * The block's id on the page.
 *
 * @param block - the block
 * @returns "landing-" and the block's key, with anything but letters, digits and "-" left out
 */
export function landingBlockAnchor(block: Pick<LandingBlock, 'id'>): string {
  return `landing-${block.id.replace(/[^A-Za-z0-9-]/g, '')}`;
}
