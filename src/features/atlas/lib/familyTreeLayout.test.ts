/**
 * Tests for lib/familyTreeLayout.ts: where the family tree's cards and lines go (S1-E17-16;
 * CALM-9, board E26: partners side by side, children hang from the middle of their line,
 * brothers and sisters share a dashed bracket).
 */
import { describe, expect, it } from 'vitest';

import type { FamilyTree } from './familyTree';
import { boxHeight, boxWidth, layoutFamilyTree, type TreeLayout } from './familyTreeLayout';

/** Two partners with one child under them. */
const smallFamily: FamilyTree = {
  generations: [['ana', 'ion'], ['vali']],
  parentLinks: [
    { parentId: 'ana', childId: 'vali' },
    { parentId: 'ion', childId: 'vali' },
  ],
  partnerLinks: [['ana', 'ion']],
  siblingLinks: [],
  cousinLinks: [],
  leftOffCount: 0,
};

/** The board's tree: Ilie beside his brother Ion, Ion with Ana, their daughter Elena with Mihai,
 * and Elena and Mihai's daughter Mara. */
const boardFamily: FamilyTree = {
  generations: [['ilie', 'ion', 'ana'], ['elena', 'mihai'], ['mara']],
  parentLinks: [
    { parentId: 'ion', childId: 'elena' },
    { parentId: 'ana', childId: 'elena' },
    { parentId: 'elena', childId: 'mara' },
    { parentId: 'mihai', childId: 'mara' },
  ],
  partnerLinks: [
    ['ion', 'ana'],
    ['elena', 'mihai'],
  ],
  siblingLinks: [['ilie', 'ion']],
  cousinLinks: [],
  leftOffCount: 0,
};

/** A card by character, failing the test when it is missing. */
function boxOf(layout: TreeLayout, id: string) {
  const box = layout.boxes.find((candidate) => candidate.id === id);
  if (box === undefined) throw new Error(`no card for ${id}`);
  return box;
}

describe('layoutFamilyTree', () => {
  it('draws cards of 200 by 58, as the board does', () => {
    expect([boxWidth, boxHeight]).toEqual([200, 58]);
  });

  it('puts each generation in its own row, the older one on top', () => {
    const layout = layoutFamilyTree(smallFamily);
    expect(boxOf(layout, 'ana').y).toBeLessThan(boxOf(layout, 'vali').y);
    expect(boxOf(layout, 'ion').y).toBe(boxOf(layout, 'ana').y);
  });

  it('sits partners 60 px apart and joins them at mid-height', () => {
    const layout = layoutFamilyTree(smallFamily);
    const ana = boxOf(layout, 'ana');
    const ion = boxOf(layout, 'ion');
    expect(ion.x - (ana.x + boxWidth)).toBe(60);
    const middle = ana.y + boxHeight / 2;
    expect(layout.partnerPaths[0]?.path).toBe(
      `M ${ana.x + boxWidth} ${middle} L ${ion.x} ${middle}`,
    );
  });

  it('hangs a child from the middle of its parents’ line, straight down', () => {
    const layout = layoutFamilyTree(smallFamily);
    const ana = boxOf(layout, 'ana');
    const vali = boxOf(layout, 'vali');
    const lineMiddle = ana.x + boxWidth + 30;
    expect(vali.x + boxWidth / 2).toBe(lineMiddle);
    expect(layout.childPaths).toEqual([
      expect.objectContaining({
        path: `M ${lineMiddle} ${ana.y + boxHeight / 2} V ${vali.y}`,
      }),
    ]);
  });

  it('gives brothers and sisters with the same parents one shared drop', () => {
    const layout = layoutFamilyTree({
      ...smallFamily,
      generations: [
        ['ana', 'ion'],
        ['vali', 'dan'],
      ],
      parentLinks: [
        ...smallFamily.parentLinks,
        { parentId: 'ana', childId: 'dan' },
        { parentId: 'ion', childId: 'dan' },
      ],
    });
    expect(layout.childPaths).toHaveLength(1);
    const vali = boxOf(layout, 'vali');
    const dan = boxOf(layout, 'dan');
    // The two children sit side by side, centred under their parents' line.
    const lineMiddle = boxOf(layout, 'ana').x + boxWidth + 30;
    expect((vali.x + dan.x + boxWidth) / 2).toBe(lineMiddle);
    expect(layout.childPaths[0]?.path).toContain(`V ${vali.y}`);
  });

  it('draws the board’s tree with Mara under Elena and Mihai, and Elena under Ion and Ana', () => {
    const layout = layoutFamilyTree(boardFamily);
    const lineMiddle = (one: string, other: string) =>
      (boxOf(layout, one).x + boxWidth + boxOf(layout, other).x) / 2;
    expect(boxOf(layout, 'mara').x + boxWidth / 2).toBe(lineMiddle('elena', 'mihai'));
    expect(boxOf(layout, 'elena').x + boxWidth / 2).toBe(lineMiddle('ion', 'ana'));
  });

  it('puts a dashed bracket over brothers who don’t share a drawn parent', () => {
    const layout = layoutFamilyTree(boardFamily);
    const ilie = boxOf(layout, 'ilie');
    const ion = boxOf(layout, 'ion');
    const top = ilie.y;
    expect(layout.siblingPaths).toEqual([
      expect.objectContaining({
        path: `M ${ilie.x + boxWidth / 2} ${top} V ${top - 18} H ${ion.x + boxWidth / 2} V ${top}`,
      }),
    ]);
    // The bracket stays inside the drawing.
    expect(top - 18).toBeGreaterThanOrEqual(0);
  });

  it('leaves out the bracket when the brothers already hang from the same parents', () => {
    const layout = layoutFamilyTree({
      ...smallFamily,
      generations: [
        ['ana', 'ion'],
        ['vali', 'dan'],
      ],
      parentLinks: [...smallFamily.parentLinks, { parentId: 'ana', childId: 'dan' }],
      siblingLinks: [['vali', 'dan']],
    });
    expect(layout.siblingPaths).toEqual([]);
  });

  it('keeps every card apart and inside the drawing', () => {
    const layout = layoutFamilyTree(boardFamily);
    for (const box of layout.boxes) {
      expect(box.x).toBeGreaterThanOrEqual(16);
      expect(box.x + boxWidth).toBeLessThanOrEqual(layout.width);
      expect(box.y + boxHeight).toBeLessThanOrEqual(layout.height);
      const overlapping = layout.boxes.filter(
        (other) => other !== box && other.y === box.y && Math.abs(other.x - box.x) < boxWidth,
      );
      expect(overlapping).toEqual([]);
    }
  });

  it('lists a maker’s line apart, so it can be dotted', () => {
    const layout = layoutFamilyTree({
      ...smallFamily,
      generations: [['mara'], ['lupul']],
      parentLinks: [{ parentId: 'mara', childId: 'lupul', isMade: true }],
      partnerLinks: [],
    });
    expect(layout.childPaths).toEqual([]);
    expect(layout.madePaths).toHaveLength(1);
  });

  it('curves a cousin line from the older row down to the younger one', () => {
    const layout = layoutFamilyTree({
      ...smallFamily,
      cousinLinks: [{ fromId: 'ion', toId: 'vali', removed: 1 }],
    });
    expect(layout.cousinPaths[0]?.path.endsWith(`${boxOf(layout, 'vali').y}`)).toBe(true);
  });
});
