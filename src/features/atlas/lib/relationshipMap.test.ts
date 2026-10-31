/**
 * Tests for the relationship map's layout (story S1-E17-15). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { CharacterRelationship } from '../api/characters';

import { layoutRelationshipMap } from './relationshipMap';

/** A relationship with only what these tests need. */
function link(id: string, fromId: string, toId: string): CharacterRelationship {
  return { id, fromId, toId, kind: 'friend_of', customLabel: '', note: '' };
}

describe('layoutRelationshipMap', () => {
  it('puts the first character at the top of the circle and the rest clockwise', () => {
    const layout = layoutRelationshipMap(['ana', 'vali', 'stefan', 'ion'], []);
    const [top, right] = layout.nodes;
    expect(top?.y).toBeLessThan(layout.size / 2);
    expect(top?.x).toBe(layout.size / 2);
    expect(right?.x).toBeGreaterThan(layout.size / 2);
  });

  it('puts one character in the middle', () => {
    const layout = layoutRelationshipMap(['ana'], []);
    expect(layout.nodes[0]).toEqual({ id: 'ana', x: layout.size / 2, y: layout.size / 2 });
  });

  it('grows with the cast so names have room', () => {
    expect(
      layoutRelationshipMap(
        Array.from({ length: 30 }, (_, i) => `c${i}`),
        [],
      ).size,
    ).toBeGreaterThan(layoutRelationshipMap(['a', 'b'], []).size);
  });

  it('draws one straight line for one relationship, and bends two between the same pair apart', () => {
    const single = layoutRelationshipMap(['a', 'b'], [link('1', 'a', 'b')]);
    expect(single.edges).toHaveLength(1);
    const double = layoutRelationshipMap(['a', 'b'], [link('1', 'a', 'b'), link('2', 'b', 'a')]);
    const [first, second] = double.edges;
    expect(first?.labelX).not.toBe(second?.labelX);
  });

  it('leaves out a line to a character that isn’t on the map', () => {
    expect(layoutRelationshipMap(['a'], [link('1', 'a', 'gone')]).edges).toEqual([]);
  });
});
