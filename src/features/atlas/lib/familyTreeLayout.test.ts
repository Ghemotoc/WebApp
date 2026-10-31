/**
 * Tests for lib/familyTreeLayout.ts: where the family tree's boxes and lines go (S1-E17-16).
 */
import { describe, expect, it } from 'vitest';

import type { FamilyTree } from './familyTree';
import { boxHeight, boxWidth, layoutFamilyTree } from './familyTreeLayout';

/** Two partners with one child under them. */
const smallFamily: FamilyTree = {
  generations: [['ana', 'ion'], ['vali']],
  parentLinks: [
    { parentId: 'ana', childId: 'vali' },
    { parentId: 'ion', childId: 'vali' },
  ],
  partnerLinks: [['ana', 'ion']],
  leftOffCount: 0,
};

describe('layoutFamilyTree', () => {
  it('puts each generation in its own row, the older one on top', () => {
    const layout = layoutFamilyTree(smallFamily);
    const top = layout.boxes.find((box) => box.id === 'ana');
    const child = layout.boxes.find((box) => box.id === 'vali');
    expect(top?.y).toBeLessThan(child?.y ?? 0);
    expect(layout.boxes.find((box) => box.id === 'ion')?.y).toBe(top?.y);
  });

  it('centres a shorter row under a longer one', () => {
    const layout = layoutFamilyTree(smallFamily);
    const child = layout.boxes.find((box) => box.id === 'vali');
    expect((child?.x ?? 0) + boxWidth / 2).toBe(layout.width / 2);
  });

  it('draws a line from each parent down into the child', () => {
    const layout = layoutFamilyTree(smallFamily);
    expect(layout.parentPaths).toHaveLength(2);
    const child = layout.boxes.find((box) => box.id === 'vali');
    expect(layout.parentPaths[0]?.path.endsWith(`V ${child?.y}`)).toBe(true);
  });

  it('joins partners side by side at mid-height', () => {
    const layout = layoutFamilyTree(smallFamily);
    const ana = layout.boxes.find((box) => box.id === 'ana');
    expect(layout.partnerPaths).toHaveLength(1);
    expect(layout.partnerPaths[0]?.path).toContain(`${(ana?.y ?? 0) + boxHeight / 2}`);
  });

  it('is tall enough for every row', () => {
    const layout = layoutFamilyTree(smallFamily);
    const lowest = Math.max(...layout.boxes.map((box) => box.y + boxHeight));
    expect(layout.height).toBeGreaterThanOrEqual(lowest);
  });
});
