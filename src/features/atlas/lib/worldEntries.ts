/**
 * The readers' world pages: finding one public entry and choosing the "More from the world" list
 * beside it (story S1-E17-33; bundle GAPS-4, board AtlasPreviewArea).
 *
 * Pure functions, no React. Who calls it: PublicWorldEntry and PublicPlanPage. What it calls:
 * nothing.
 */
import type { PublicEntry, PublicPlan, PublicSection } from '../api/publicPlan';

/** One public entry with the section it sits in. */
export interface PlacedEntry {
  entry: PublicEntry;
  section: PublicSection;
}

/** The longest "More from the world" list: enough to browse, short enough to sit beside a page. */
export const moreFromWorldLimit = 8;

/**
 * Every public entry with its section, in the world's own order.
 *
 * @param plan - the public plan
 * @returns the entries, section by section
 */
function placedEntries(plan: PublicPlan): PlacedEntry[] {
  return plan.sections.flatMap((section) => section.entries.map((entry) => ({ entry, section })));
}

/**
 * The public entry an address names.
 *
 * @param plan - the public plan
 * @param entryId - the entry's ID from the address
 * @returns the entry and its section, or null when readers can't see it (private, waiting for a
 *   chapter or not there), so a private entry's address gives nothing away
 */
export function findPublicEntry(plan: PublicPlan, entryId: string): PlacedEntry | null {
  return placedEntries(plan).find((placed) => placed.entry.id === entryId) ?? null;
}

/**
 * The other entries to offer beside one entry: its own section's first, then the rest of the
 * world in order, never the open entry itself.
 *
 * @param plan - the public plan
 * @param entryId - the open entry
 * @returns at most moreFromWorldLimit entries
 */
export function moreFromWorld(plan: PublicPlan, entryId: string): PlacedEntry[] {
  const open = findPublicEntry(plan, entryId);
  const others = placedEntries(plan).filter((placed) => placed.entry.id !== entryId);
  // Step 1: the neighbours in the same section come first, since they are the closest reading.
  const neighbours = others.filter((placed) => placed.section.id === open?.section.id);
  const elsewhere = others.filter((placed) => placed.section.id !== open?.section.id);
  // Step 2: a short list.
  return [...neighbours, ...elsewhere].slice(0, moreFromWorldLimit);
}
