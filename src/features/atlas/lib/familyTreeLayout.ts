/**
 * Where the family tree draws each box and each line (story S1-E17-16: "generations are laid out
 * top to bottom, partners side by side, with lines from parents to children").
 *
 * Each generation is one centred row of boxes; parent lines leave the bottom of the parent's box,
 * drop to halfway between the rows, run across and drop into the child's box. Partner lines join
 * the two boxes at mid-height. Who calls it: FamilyTreeView. What it calls: nothing; the tree
 * itself comes from lib/familyTree.ts.
 */
import type { FamilyTree } from './familyTree';

/** One box's size and the gaps between boxes and rows, in pixels. */
export const boxWidth = 140;
export const boxHeight = 52;
const columnGap = 32;
const rowGap = 72;
const margin = 16;
/** Room above the top row for the arch between siblings or cousins in it. */
const topMargin = rowGap / 2 + margin;

/** One box: its character and its top-left corner. */
export interface TreeBox {
  id: string;
  x: number;
  y: number;
}

/** The drawing: its size, the boxes and the line paths. */
export interface TreeLayout {
  width: number;
  height: number;
  boxes: TreeBox[];
  parentPaths: { key: string; path: string }[];
  partnerPaths: { key: string; path: string }[];
  siblingPaths: { key: string; path: string }[];
  cousinPaths: { key: string; path: string }[];
}

/**
 * A curve between two boxes that never crosses the boxes between them: an arch over the tops when
 * both are in the same row, otherwise an S-curve from the upper box's bottom to the lower one's
 * top. Used for siblings and cousins (G10b2).
 */
function connector(one: TreeBox, other: TreeBox): string {
  const [upper, lower] = one.y <= other.y ? [one, other] : [other, one];
  const upperX = upper.x + boxWidth / 2;
  const lowerX = lower.x + boxWidth / 2;
  if (upper.y === lower.y) {
    const archTop = upper.y - rowGap / 2;
    return `M ${upperX} ${upper.y} C ${upperX} ${archTop} ${lowerX} ${archTop} ${lowerX} ${lower.y}`;
  }
  const startY = upper.y + boxHeight;
  const middleY = (startY + lower.y) / 2;
  return `M ${upperX} ${startY} C ${upperX} ${middleY} ${lowerX} ${middleY} ${lowerX} ${lower.y}`;
}

/** Puts every generation's boxes in a centred row. */
function placeBoxes(generations: string[][], width: number): TreeBox[] {
  return generations.flatMap((row, rowIndex) => {
    const rowWidth = row.length * boxWidth + (row.length - 1) * columnGap;
    const left = (width - rowWidth) / 2;
    return row.map((id, column) => ({
      id,
      x: left + column * (boxWidth + columnGap),
      y: topMargin + rowIndex * (boxHeight + rowGap),
    }));
  });
}

/**
 * Lays out the tree.
 *
 * @param tree - the generations and links from buildFamilyTree()
 * @returns the size, the boxes and the paths
 */
export function layoutFamilyTree(tree: FamilyTree): TreeLayout {
  // Step 1: wide enough for the longest row, tall enough for every row.
  const widest = Math.max(1, ...tree.generations.map((row) => row.length));
  const width = 2 * margin + widest * boxWidth + (widest - 1) * columnGap;
  const height = topMargin + margin + tree.generations.length * (boxHeight + rowGap) - rowGap;
  const boxes = placeBoxes(tree.generations, width);
  const boxOf = new Map(boxes.map((box) => [box.id, box]));

  // Step 2: an elbow line from each parent's bottom to each child's top.
  const parentPaths = tree.parentLinks.flatMap(({ parentId, childId }) => {
    const parent = boxOf.get(parentId);
    const child = boxOf.get(childId);
    if (parent === undefined || child === undefined) return [];
    const startX = parent.x + boxWidth / 2;
    const startY = parent.y + boxHeight;
    const endX = child.x + boxWidth / 2;
    const middleY = child.y - rowGap / 2;
    const path = `M ${startX} ${startY} V ${middleY} H ${endX} V ${child.y}`;
    return [{ key: `${parentId}>${childId}`, path }];
  });

  // Step 3: a line between partners' facing sides, at mid-height.
  const partnerPaths = tree.partnerLinks.flatMap(([first, second]) => {
    const one = boxOf.get(first);
    const other = boxOf.get(second);
    if (one === undefined || other === undefined) return [];
    const [left, right] = one.x <= other.x ? [one, other] : [other, one];
    const y = left.y + boxHeight / 2;
    const path = `M ${left.x + boxWidth} ${y} L ${right.x} ${right.y + boxHeight / 2}`;
    return [{ key: `${first}+${second}`, path }];
  });

  // Step 4: siblings and cousins, curved so they don't run through other boxes.
  const curvesFor = (pairs: [string, string][]) =>
    pairs.flatMap(([first, second]) => {
      const one = boxOf.get(first);
      const other = boxOf.get(second);
      if (one === undefined || other === undefined) return [];
      return [{ key: `${first}~${second}`, path: connector(one, other) }];
    });
  const siblingPaths = curvesFor(tree.siblingLinks);
  const cousinPaths = curvesFor(
    tree.cousinLinks.map((link): [string, string] => [link.fromId, link.toId]),
  );

  return { width, height, boxes, parentPaths, partnerPaths, siblingPaths, cousinPaths };
}
