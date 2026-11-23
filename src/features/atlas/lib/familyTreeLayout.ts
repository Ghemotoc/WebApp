/**
 * Where the family tree draws each card and each line (story S1-E17-16; CALM-9, board E26: "a
 * real tree: partners side by side joined by a line, children hang from the middle of their
 * parents' line, brothers and sisters share a dashed bracket above them").
 *
 * - Each generation is one row of 200 × 58 cards, the oldest at the top.
 * - Partners sit 60 px apart, joined by a line at mid-height; everyone else is 80 px apart.
 * - A child hangs from the middle of its parents' line, or from the bottom of a parent who has no
 *   partner in the tree. Brothers and sisters with the same parents share one drop: down to
 *   halfway between the rows, across, and down into each card.
 * - Each row is placed so its children sit under their parents where they can; a row never
 *   overlaps itself, so a crowded row pushes on to the right and the line bends to reach it.
 * - Brothers and sisters ("Sibling of") who don't already hang from the same parents share a
 *   dashed bracket over their cards.
 * - Cousins keep a curved dotted line (S1-E17-16), which never runs through the cards between.
 * Who calls it: FamilyTreeView and FamilyTreeLines. What it calls: nothing; the tree itself comes
 * from lib/familyTree.ts.
 */
import type { FamilyTree, ParentLink } from './familyTree';

/** One card's size and the gaps between cards and rows, in pixels (board E26). */
export const boxWidth = 200;
export const boxHeight = 58;
const partnerGap = 60;
const columnGap = 80;
const rowGap = 58;
const margin = 16;
/** How far the sibling bracket rises above the cards' tops. */
const bracketRise = 18;
/** Room above the top row for its bracket. */
const topMargin = 30;

/** One card: its character and its top-left corner. */
export interface TreeBox {
  id: string;
  x: number;
  y: number;
}

/** One drawn line: a stable key and its SVG path. */
export interface TreePath {
  key: string;
  path: string;
}

/** The drawing: its size, the cards and the line paths. */
export interface TreeLayout {
  width: number;
  height: number;
  boxes: TreeBox[];
  /** The lines from parents down to children; makers' lines are listed apart, to be dotted. */
  childPaths: TreePath[];
  madePaths: TreePath[];
  partnerPaths: TreePath[];
  siblingPaths: TreePath[];
  cousinPaths: TreePath[];
}

/** The partner pairs as a lookup: "a+b" in both orders. */
function partnerKeys(tree: FamilyTree): Set<string> {
  return new Set(
    tree.partnerLinks.flatMap(([one, other]) => [`${one}+${other}`, `${other}+${one}`]),
  );
}

/** Each character's parents in the tree, birth and made kept apart. */
function parentsByChild(links: ParentLink[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  for (const link of links) {
    parents.set(link.childId, [...(parents.get(link.childId) ?? []), link.parentId]);
  }
  return parents;
}

/**
 * Splits a row into blocks that must stay together: a run of neighbours joined as partners or
 * by a parent in common. The row's order already puts them side by side (lib/familyTree.ts).
 */
function blocksOf(row: string[], joined: (one: string, other: string) => boolean): string[][] {
  const blocks: string[][] = [];
  for (const id of row) {
    const current = blocks.at(-1);
    const previous = current?.at(-1);
    if (current !== undefined && previous !== undefined && joined(previous, id)) current.push(id);
    else blocks.push([id]);
  }
  return blocks;
}

/** Where each card in a block sits, measured from the block's left edge. */
function offsetsIn(block: string[], partners: Set<string>): number[] {
  const offsets: number[] = [];
  let left = 0;
  block.forEach((id, index) => {
    const previous = block[index - 1];
    if (previous !== undefined) {
      left += boxWidth + (partners.has(`${previous}+${id}`) ? partnerGap : columnGap);
    }
    offsets.push(left);
  });
  return offsets;
}

/** What the placing of one row needs to know about the rows above it. */
interface RowContext {
  partners: Set<string>;
  parentsOf: Map<string, string[]>;
  /** The centre of every card placed so far, by character. */
  centreOf: Map<string, number>;
}

/**
 * The x a block would like its left edge at, so its children sit under the middle of their
 * parents; null when nobody in it has a parent placed above.
 */
function wantedLeft(block: string[], offsets: number[], context: RowContext): number | null {
  const wishes: number[] = [];
  block.forEach((id, index) => {
    const parentCentres = (context.parentsOf.get(id) ?? []).flatMap((parentId) => {
      const centre = context.centreOf.get(parentId);
      return centre === undefined ? [] : [centre];
    });
    if (parentCentres.length === 0) return;
    // Under the middle of the parents (the middle of their line, for a couple).
    const under = parentCentres.reduce((sum, centre) => sum + centre, 0) / parentCentres.length;
    wishes.push(under - boxWidth / 2 - (offsets[index] ?? 0));
  });
  if (wishes.length === 0) return null;
  return wishes.reduce((sum, wish) => sum + wish, 0) / wishes.length;
}

/**
 * Places one row: blocks sorted by where they want to be, each at its wish or straight after the
 * block on its left, whichever is further right, so nothing overlaps.
 *
 * @returns the row's cards, with their x; y is added by the caller
 */
function placeRow(row: string[], context: RowContext): { id: string; x: number }[] {
  // Partners, and brothers and sisters with a parent in common, stay together as one block.
  const shareParent = (one: string, other: string) =>
    (context.parentsOf.get(one) ?? []).some((parent) =>
      (context.parentsOf.get(other) ?? []).includes(parent),
    );
  const joined = (one: string, other: string) =>
    context.partners.has(`${one}+${other}`) || shareParent(one, other);
  // Step 1: the blocks, each with its cards' offsets and the left edge it would like.
  let lastWish = Number.NEGATIVE_INFINITY;
  const blocks = blocksOf(row, joined).map((block) => {
    const offsets = offsetsIn(block, context.partners);
    const wish = wantedLeft(block, offsets, context);
    // A block with no parents above keeps its place in the order, after the block before it.
    lastWish = wish ?? lastWish;
    return { block, offsets, wish, sortBy: lastWish };
  });
  // Step 2: left to right by wish, never overlapping the block before.
  const sorted = [...blocks].sort((one, other) => one.sortBy - other.sortBy);
  const placed: { id: string; x: number }[] = [];
  let nextFree = Number.NEGATIVE_INFINITY;
  for (const { block, offsets, wish } of sorted) {
    const left = Math.max(wish ?? nextFree, nextFree);
    const start = Number.isFinite(left) ? left : 0;
    block.forEach((id, index) => placed.push({ id, x: start + (offsets[index] ?? 0) }));
    nextFree = start + (offsets.at(-1) ?? 0) + boxWidth + columnGap;
  }
  return placed;
}

/** Places every row top to bottom, then moves the whole tree so it starts at the margin. */
function placeBoxes(tree: FamilyTree): TreeBox[] {
  const context: RowContext = {
    partners: partnerKeys(tree),
    parentsOf: parentsByChild(tree.parentLinks),
    centreOf: new Map(),
  };
  const boxes: TreeBox[] = [];
  tree.generations.forEach((row, rowIndex) => {
    const y = topMargin + rowIndex * (boxHeight + rowGap);
    for (const { id, x } of placeRow(row, context)) {
      boxes.push({ id, x, y });
      context.centreOf.set(id, x + boxWidth / 2);
    }
  });
  const leftmost = Math.min(...boxes.map((box) => box.x));
  return boxes.map((box) => ({ ...box, x: box.x - leftmost + margin }));
}

/** Where a family's line starts: the middle of a couple's line, or under one parent. */
interface Origin {
  key: string;
  x: number;
  y: number;
}

/** The origins of one child's lines: one for a couple in the tree, else one per parent. */
function originsOf(parents: TreeBox[], partners: Set<string>): Origin[] {
  const [one, other] = parents;
  if (parents.length === 2 && one !== undefined && other !== undefined) {
    if (one.y === other.y && partners.has(`${one.id}+${other.id}`)) {
      const [left, right] = one.x <= other.x ? [one, other] : [other, one];
      const middle = (left.x + boxWidth + right.x) / 2;
      return [{ key: `${left.id}+${right.id}`, x: middle, y: left.y + boxHeight / 2 }];
    }
  }
  return parents.map((parent) => ({
    key: parent.id,
    x: parent.x + boxWidth / 2,
    y: parent.y + boxHeight,
  }));
}

/** One drop from an origin to its children: down, across, and down into each card. */
function dropPath(origin: Origin, children: TreeBox[]): string {
  const centres = children.map((child) => child.x + boxWidth / 2);
  const childTop = children[0]?.y ?? origin.y;
  const [onlyCentre] = centres;
  if (centres.length === 1 && onlyCentre !== undefined && Math.abs(onlyCentre - origin.x) < 1) {
    return `M ${origin.x} ${origin.y} V ${childTop}`;
  }
  const middleY = childTop - rowGap / 2;
  const leftmost = Math.min(origin.x, ...centres);
  const rightmost = Math.max(origin.x, ...centres);
  const drops = centres.map((centre) => `M ${centre} ${middleY} V ${childTop}`).join(' ');
  return `M ${origin.x} ${origin.y} V ${middleY} M ${leftmost} ${middleY} H ${rightmost} ${drops}`;
}

/**
 * The lines from parents to children, grouped so brothers and sisters with the same parents
 * share one drop.
 *
 * @param links - the parent links of one kind (birth, or made)
 */
function childPathsFor(
  links: ParentLink[],
  boxOf: Map<string, TreeBox>,
  partners: Set<string>,
): TreePath[] {
  const groups = new Map<string, { origin: Origin; children: TreeBox[] }>();
  for (const [childId, parentIds] of parentsByChild(links)) {
    const child = boxOf.get(childId);
    const parents = parentIds.flatMap((id) => boxOf.get(id) ?? []);
    if (child === undefined) continue;
    for (const origin of originsOf(parents, partners)) {
      // Children of the same origin in the same row share one drop.
      const groupKey = `${origin.key}@${child.y}`;
      const group = groups.get(groupKey) ?? { origin, children: [] };
      group.children.push(child);
      groups.set(groupKey, group);
    }
  }
  return [...groups].map(([key, { origin, children }]) => ({
    key,
    path: dropPath(origin, children),
  }));
}

/** A line between partners' facing sides, at mid-height. */
function partnerPathsFor(tree: FamilyTree, boxOf: Map<string, TreeBox>): TreePath[] {
  return tree.partnerLinks.flatMap(([first, second]) => {
    const one = boxOf.get(first);
    const other = boxOf.get(second);
    if (one === undefined || other === undefined) return [];
    const [left, right] = one.x <= other.x ? [one, other] : [other, one];
    const y = left.y + boxHeight / 2;
    return [{ key: `${first}+${second}`, path: `M ${left.x + boxWidth} ${y} L ${right.x} ${y}` }];
  });
}

/** Groups sibling pairs into sets of brothers and sisters, leaving out pairs already joined by
 * a shared parent's drop. */
function siblingGroups(tree: FamilyTree): string[][] {
  const parentsOf = parentsByChild(tree.parentLinks);
  const shareParent = (one: string, other: string) =>
    (parentsOf.get(one) ?? []).some((parent) => (parentsOf.get(other) ?? []).includes(parent));
  const groups: Set<string>[] = [];
  for (const [one, other] of tree.siblingLinks) {
    if (shareParent(one, other)) continue;
    const joined = groups.filter((group) => group.has(one) || group.has(other));
    const merged = new Set([one, other, ...joined.flatMap((group) => [...group])]);
    for (const group of joined) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  }
  return groups.map((group) => [...group]);
}

/** One dashed bracket over each set of brothers and sisters. */
function siblingPathsFor(tree: FamilyTree, boxOf: Map<string, TreeBox>): TreePath[] {
  return siblingGroups(tree).flatMap((group) => {
    const boxes = group.flatMap((id) => boxOf.get(id) ?? []);
    const top = boxes[0]?.y;
    if (top === undefined || boxes.length < 2) return [];
    const centres = boxes.map((box) => box.x + boxWidth / 2).sort((one, other) => one - other);
    const barY = top - bracketRise;
    const leftmost = centres[0] ?? 0;
    const rightmost = centres.at(-1) ?? 0;
    const ticks = centres
      .slice(1, -1)
      .map((centre) => `M ${centre} ${barY} V ${top}`)
      .join(' ');
    const bracket = `M ${leftmost} ${top} V ${barY} H ${rightmost} V ${top}`;
    return [{ key: group.join('~'), path: ticks === '' ? bracket : `${bracket} ${ticks}` }];
  });
}

/**
 * A cousin's curve that never crosses the cards between: an arch over the tops when both are in
 * the same row, otherwise an S-curve from the upper card's bottom to the lower one's top.
 */
function cousinPath(one: TreeBox, other: TreeBox): string {
  const [upper, lower] = one.y <= other.y ? [one, other] : [other, one];
  const upperX = upper.x + boxWidth / 2;
  const lowerX = lower.x + boxWidth / 2;
  if (upper.y === lower.y) {
    const archTop = Math.max(0, upper.y - topMargin);
    return `M ${upperX} ${upper.y} C ${upperX} ${archTop} ${lowerX} ${archTop} ${lowerX} ${lower.y}`;
  }
  const startY = upper.y + boxHeight;
  const middleY = (startY + lower.y) / 2;
  return `M ${upperX} ${startY} C ${upperX} ${middleY} ${lowerX} ${middleY} ${lowerX} ${lower.y}`;
}

/**
 * Lays out the tree.
 *
 * @param tree - the generations and links from buildFamilyTree()
 * @returns the size, the cards and the paths
 */
export function layoutFamilyTree(tree: FamilyTree): TreeLayout {
  // Step 1: the cards, row by row, children under their parents where they fit.
  const boxes = placeBoxes(tree);
  const boxOf = new Map(boxes.map((box) => [box.id, box]));
  const partners = partnerKeys(tree);
  // Step 2: wide enough for the widest row, tall enough for every row.
  const width = Math.max(0, ...boxes.map((box) => box.x + boxWidth)) + margin;
  const height = topMargin + tree.generations.length * (boxHeight + rowGap) - rowGap + margin;
  // Step 3: the lines.
  const birthLinks = tree.parentLinks.filter((link) => link.isMade !== true);
  const madeLinks = tree.parentLinks.filter((link) => link.isMade === true);
  const cousinPaths = tree.cousinLinks.flatMap(({ fromId, toId }) => {
    const one = boxOf.get(fromId);
    const other = boxOf.get(toId);
    if (one === undefined || other === undefined) return [];
    return [{ key: `${fromId}~${toId}`, path: cousinPath(one, other) }];
  });
  return {
    width,
    height,
    boxes,
    childPaths: childPathsFor(birthLinks, boxOf, partners),
    madePaths: childPathsFor(madeLinks, boxOf, partners),
    partnerPaths: partnerPathsFor(tree, boxOf),
    siblingPaths: siblingPathsFor(tree, boxOf),
    cousinPaths,
  };
}
