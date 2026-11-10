/**
 * Builds the family tree from the family relationships (story S1-E17-16: "generations are laid
 * out top to bottom, partners side by side, with lines from parents to children"; bundle G10
 * ATLAS, part b2, board AtlasFamilyTree).
 *
 * - "Parent of" links a parent to a child; with "Include turned or made" on, "turned or made"
 *   counts as a parent too (vampire and maker bloodlines).
 * - "Partner or spouse of" and "Sibling of" put two characters in the same generation, side by
 *   side where the row allows.
 * - "Cousin of" puts cousins in the same generation, or, for a cousin removed, the second
 *   character that many generations below the first (the builder's reading: the first character
 *   is the older one, as in "Ana is the first cousin once removed of Vali").
 * - "Whose tree" keeps only the chosen character's family: everyone joined to them by family
 *   links, however distant.
 * - Characters with no family link are left off, and the count says how many.
 * Who calls it: FamilyTreeView. What it calls: nothing.
 */
import type { CharacterRelationship } from '../api/characters';

/** One parent-to-child line. */
export interface ParentLink {
  parentId: string;
  childId: string;
}

/** One cousin line: the older character, the younger, and how many generations apart. */
export interface CousinLink {
  fromId: string;
  toId: string;
  removed: number;
}

/** The tree: rows of character IDs from the oldest generation down, the lines, and who is off. */
export interface FamilyTree {
  generations: string[][];
  parentLinks: ParentLink[];
  partnerLinks: [string, string][];
  siblingLinks: [string, string][];
  cousinLinks: CousinLink[];
  leftOffCount: number;
}

/** Every family line, ready to be laid out. */
interface FamilyLinks {
  parents: ParentLink[];
  partners: [string, string][];
  siblings: [string, string][];
  cousins: CousinLink[];
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
 * Works out each character's generation: a child sits one below its lowest parent, partners,
 * siblings and cousins share the lower of their rows, and a cousin removed sits that many rows
 * below the older one. A loop in the links (a writer's mistake, or time travel) is cut off after
 * as many rounds as there are characters, so it can't run forever.
 *
 * @returns the generation number of every family member, from 0
 */
function generationsOf(members: string[], links: FamilyLinks) {
  const generation = new Map(members.map((id) => [id, 0]));
  const rowOf = (id: string) => generation.get(id) ?? 0;
  for (let round = 0; round < members.length; round += 1) {
    let changed = false;
    // Each rule only ever pushes a row down, so the rounds settle.
    const pushDown = (id: string, atLeast: number) => {
      if (rowOf(id) < atLeast) {
        generation.set(id, atLeast);
        changed = true;
      }
    };
    for (const link of links.parents) pushDown(link.childId, rowOf(link.parentId) + 1);
    for (const [first, second] of [...links.partners, ...links.siblings]) {
      const lower = Math.max(rowOf(first), rowOf(second));
      pushDown(first, lower);
      pushDown(second, lower);
    }
    for (const { fromId, toId, removed } of links.cousins) {
      pushDown(toId, rowOf(fromId) + removed);
      pushDown(fromId, rowOf(toId) - removed);
    }
    if (!changed) break;
  }
  return generation;
}

/**
 * Orders one generation so partners, then siblings, sit side by side, otherwise in the cast's
 * order.
 *
 * @param pairs - the partner pairs, then the sibling pairs
 * @returns the row's character IDs
 */
function orderRow(row: string[], pairs: [string, string][]): string[] {
  const ordered: string[] = [];
  for (const id of row) {
    if (ordered.includes(id)) continue;
    ordered.push(id);
    // Every partner or sibling of this character in the same row goes straight after them.
    for (const [first, second] of pairs) {
      if (first !== id && second !== id) continue;
      const partner = first === id ? second : first;
      if (row.includes(partner) && !ordered.includes(partner)) ordered.push(partner);
    }
  }
  return ordered;
}

/** The family lines between characters still in the cast. */
function familyLinksFrom(
  known: Set<string>,
  relationships: CharacterRelationship[],
  includeMade: boolean,
): FamilyLinks {
  const inCast = (link: CharacterRelationship) => known.has(link.fromId) && known.has(link.toId);
  const pairsOf = (kind: CharacterRelationship['kind']) =>
    relationships
      .filter((link) => link.kind === kind && inCast(link))
      .map((link): [string, string] => [link.fromId, link.toId]);
  return {
    parents: parentLinksFrom(relationships, includeMade).filter(
      (link) => known.has(link.parentId) && known.has(link.childId),
    ),
    partners: pairsOf('partner_of'),
    siblings: pairsOf('sibling_of'),
    cousins: relationships
      .filter((link) => link.kind === 'cousin_of' && inCast(link))
      .map((link) => ({ fromId: link.fromId, toId: link.toId, removed: link.cousinRemoved ?? 0 })),
  };
}

/** Every family line as a pair of characters, whatever its kind. */
function allPairs(links: FamilyLinks): [string, string][] {
  return [
    ...links.parents.map((link): [string, string] => [link.parentId, link.childId]),
    ...links.partners,
    ...links.siblings,
    ...links.cousins.map((link): [string, string] => [link.fromId, link.toId]),
  ];
}

/** The chosen character and everyone joined to them by family lines, however distant. */
function familyOf(rootId: string, pairs: [string, string][]): Set<string> {
  const family = new Set([rootId]);
  let grew = true;
  // Step by step outwards until a round adds nobody new.
  while (grew) {
    grew = false;
    for (const [first, second] of pairs) {
      if (family.has(first) === family.has(second)) continue;
      family.add(first);
      family.add(second);
      grew = true;
    }
  }
  return family;
}

/** Only the lines between characters in the tree. */
function linksAmong(links: FamilyLinks, members: Set<string>): FamilyLinks {
  const both = ([first, second]: [string, string]) => members.has(first) && members.has(second);
  return {
    parents: links.parents.filter(
      (link) => members.has(link.parentId) && members.has(link.childId),
    ),
    partners: links.partners.filter(both),
    siblings: links.siblings.filter(both),
    cousins: links.cousins.filter((link) => members.has(link.fromId) && members.has(link.toId)),
  };
}

/**
 * Builds the tree.
 *
 * @param characterIds - every character, in the cast's name order
 * @param relationships - every relationship in the story
 * @param includeMade - the "Include turned or made" switch
 * @param rootId - "Whose tree": a character, or null for every family in the story
 * @returns the generations, the lines and how many characters are left off
 */
export function buildFamilyTree(
  characterIds: string[],
  relationships: CharacterRelationship[],
  includeMade: boolean,
  rootId: string | null = null,
): FamilyTree {
  // Step 1: the family lines, only between characters still in the cast.
  const allLinks = familyLinksFrom(new Set(characterIds), relationships, includeMade);
  const pairs = allPairs(allLinks);
  const linked = new Set(pairs.flat());
  // Step 2: the members: every linked character, or only the chosen character's family.
  const family = rootId !== null && linked.has(rootId) ? familyOf(rootId, pairs) : linked;
  const members = characterIds.filter((id) => family.has(id));
  const links = linksAmong(allLinks, family);
  // Step 3: the rows, top to bottom, partners and siblings side by side.
  const generation = generationsOf(members, links);
  const deepest = Math.max(-1, ...generation.values());
  const generations = Array.from({ length: deepest + 1 }, (_, row) =>
    orderRow(
      members.filter((id) => generation.get(id) === row),
      [...links.partners, ...links.siblings],
    ),
  ).filter((row) => row.length > 0);
  return {
    generations,
    parentLinks: links.parents,
    partnerLinks: links.partners,
    siblingLinks: links.siblings,
    cousinLinks: links.cousins,
    leftOffCount: characterIds.length - linked.size,
  };
}
