/**
 * builderKinds: which landing block kinds the page builder added (story S1-E11-34; bundle CMS-2b).
 *
 * The public page draws these five kinds in BuilderBlocks.tsx; the older kinds stay in
 * LandingBlockView.tsx. Keeping the list here lets both files share it without a component file
 * exporting a plain function (fast refresh needs component files to export only components).
 * Who calls it: LandingBlockView and BuilderBlocks. What it calls: nothing.
 */
import type { LandingBlockKind } from '@/schemas/landingPages';

/** The page builder's five kinds. */
export const builderKinds: readonly LandingBlockKind[] = [
  'picture_text',
  'cards',
  'steps',
  'quote',
  'call_to_action',
];

/**
 * Says whether a block kind is one of the page builder's five.
 *
 * @param kind - the block's kind
 * @returns true for picture and text, cards, steps, quote and call to action
 */
export function isBuilderKind(kind: LandingBlockKind): boolean {
  return builderKinds.includes(kind);
}
