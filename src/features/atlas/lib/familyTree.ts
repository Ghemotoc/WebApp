/**
 * Builds the family tree from the parent and partner relationships (story S1-E17-16: "generations
 * are laid out top to bottom, partners side by side, with lines from parents to children").
 *
 * - "Parent of" links a parent to a child; with "Include turned or made" on, "turned or made"
 *   counts as a parent too (vampire and maker bloodlines).
 * - "Partner or spouse of" puts two characters side by side in the same generation.
 * - Characters with no family link are left off, and the count says how many.
 * Who calls it: FamilyTreeView. What it calls: nothing.
 */
import type { CharacterRelationship } from '../api/characters';

/** One parent-to-child line. */
export interface ParentLink {
  parentId: string;
  childId: string;
}

/** The tree: rows of character IDs from the oldest generation down, the lines, and who is off. */
export interface FamilyTree {
  generations: string[][];
  parentLinks: ParentLink[];
  partnerLinks: [string, string][];
  leftOffCount: number;
}

/** The parent-to-child links, with makers counted when asked. */
function parentLinksFrom(
  relationships: CharacterRelationship[],
  includeMade: boolean,
): ParentLink[] {
  return relationships
    .filter((link) => link.kind === 'parent_of' || (includeMade && link.kind === 'made'))
    .map((link) => ({ parentId: link.fromId, childId: link.toId }));
}

/**
 * Works out each character's generation: a child sits one below its lowest parent, and partners
 * share the lower of their two rows. A loop in the links (a writer's mistake, or time travel) is
 * cut off after as many rounds as there are characters, so it can't run forever.
 *
 * @returns the generation number of every family member, from 0
 */
function generationsOf(members: string[], parents: ParentLink[], partners: [string, string][]) {
  const generation = new Map(members.map((id) => [id, 0]));
  for (let round = 0; round < members.length; round += 1) {
    let changed = false;
    // Each rule only ever pushes a row down, so the rounds settle.
    const pushDown = (id: string, atLeast: number) => {
      if ((generation.get(id) ?? 0) < atLeast) {
        generation.set(id, atLeast);
        changed = true;
      }
    };
    for (const link of parents) pushDown(link.childId, (generation.get(link.parentId) ?? 0) + 1);
    for (const [first, second] of partners) {
      const lower = Math.max(generation.get(first) ?? 0, generation.get(second) ?? 0);
      pushDown(first, lower);
      pushDown(second, lower);
    }
    if (!changed) break;
  }
  return generation;
}

/**
 * Orders one generation so partners sit side by side, otherwise in the cast's order.
 *
 * @returns the row's character IDs
 */
function orderRow(row: string[], partners: [string, string][]): string[] {
  const ordered: string[] = [];
  for (const id of row) {
    if (ordered.includes(id)) continue;
    ordered.push(id);
    // Every partner of this character in the same row goes straight after them.
    for (const [first, second] of partners) {
      if (first !== id && second !== id) continue;
      const partner = first === id ? second : first;
      if (row.includes(partner) && !ordered.includes(partner)) ordered.push(partner);
    }
  }
  return ordered;
}

/**
 * Builds the tree.
 *
 * @param characterIds - every character, in the cast's name order
 * @param relationships - every relationship in the story
 * @param includeMade - the "Include turned or made" switch
 * @returns the generations, the lines and how many characters are left off
 */
export function buildFamilyTree(
  characterIds: string[],
  relationships: CharacterRelationship[],
  includeMade: boolean,
): FamilyTree {
  // Step 1: the family links, only between characters still in the cast.
  const known = new Set(characterIds);
  const parentLinks = parentLinksFrom(relationships, includeMade).filter(
    (link) => known.has(link.parentId) && known.has(link.childId),
  );
  const partnerLinks = relationships
    .filter((link) => link.kind === 'partner_of' && known.has(link.fromId) && known.has(link.toId))
    .map((link): [string, string] => [link.fromId, link.toId]);
  // Step 2: the family members, in the cast's order; everyone else is left off.
  const linked = new Set([
    ...parentLinks.flatMap((link) => [link.parentId, link.childId]),
    ...partnerLinks.flat(),
  ]);
  const members = characterIds.filter((id) => linked.has(id));
  // Step 3: the rows, top to bottom, partners side by side.
  const generation = generationsOf(members, parentLinks, partnerLinks);
  const deepest = Math.max(-1, ...generation.values());
  const generations = Array.from({ length: deepest + 1 }, (_, row) =>
    orderRow(
      members.filter((id) => generation.get(id) === row),
      partnerLinks,
    ),
  ).filter((row) => row.length > 0);
  return {
    generations,
    parentLinks,
    partnerLinks,
    leftOffCount: characterIds.length - members.length,
  };
}
