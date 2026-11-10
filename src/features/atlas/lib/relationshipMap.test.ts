/**
 * Tests for the relationship map's layout (story S1-E17-15). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { CharacterRelationship } from '../api/characters';

import {
  cardHeight,
  cardUnder,
  cardWidth,
  clampPlace,
  fitZoom,
  layoutRelationshipMap,
  splitMapCast,
} from './relationshipMap';

/** Cards the writer hasn't moved. */
function cards(...ids: string[]) {
  return ids.map((id) => ({ id, mapPlace: null }));
}

/** A relationship with only what these tests need. */
function link(id: string, fromId: string, toId: string): CharacterRelationship {
  return {
    id,
    fromId,
    toId,
    kind: 'friend_of',
    customLabel: '',
    reverseLabel: '',
    cousinDegree: null,
    cousinRemoved: null,
    note: '',
  };
}

describe('layoutRelationshipMap', () => {
  it('puts the first card at the top of the circle and the rest clockwise', () => {
    const layout = layoutRelationshipMap(cards('ana', 'vali', 'stefan', 'ion'), []);
    const [top, right] = layout.nodes;
    const middleX = layout.width / 2 - cardWidth / 2;
    expect(top?.y).toBeLessThan(layout.height / 2);
    expect(top?.x).toBeCloseTo(middleX, 0);
    expect(right?.x).toBeGreaterThan(middleX);
  });

  it('keeps a card where the writer dropped it, and grows to hold it', () => {
    const layout = layoutRelationshipMap(
      [{ id: 'ana', mapPlace: { x: 1200, y: 900 } }, ...cards('vali')],
      [],
    );
    expect(layout.nodes[0]).toEqual({ id: 'ana', x: 1200, y: 900 });
    expect(layout.width).toBeGreaterThanOrEqual(1200 + cardWidth);
    expect(layout.height).toBeGreaterThanOrEqual(900 + cardHeight);
  });

  it('grows with the cast so the cards have room', () => {
    const many = cards(...Array.from({ length: 30 }, (_, index) => `c${index}`));
    expect(layoutRelationshipMap(many, []).width).toBeGreaterThan(
      layoutRelationshipMap(cards('a', 'b'), []).width,
    );
  });

  it('stops a line at the cards’ edges, not their middles', () => {
    const layout = layoutRelationshipMap(
      [
        { id: 'a', mapPlace: { x: 0, y: 0 } },
        { id: 'b', mapPlace: { x: 400, y: 0 } },
      ],
      [link('1', 'a', 'b')],
    );
    expect(layout.edges[0]?.path.startsWith(`M ${cardWidth + 2} ${cardHeight / 2}`)).toBe(true);
  });

  it('bends two lines between the same pair apart', () => {
    const double = layoutRelationshipMap(cards('a', 'b'), [
      link('1', 'a', 'b'),
      link('2', 'b', 'a'),
    ]);
    const [first, second] = double.edges;
    expect(first?.labelX).not.toBe(second?.labelX);
  });

  it('leaves out a line to a character that isn’t on the map', () => {
    expect(layoutRelationshipMap(cards('a'), [link('1', 'a', 'gone')]).edges).toEqual([]);
  });
});

describe('the map’s helpers', () => {
  it('only characters in a relationship go on the map; the rest are not on it yet', () => {
    expect(splitMapCast(['a', 'b', 'c'], [link('1', 'a', 'b')])).toEqual({
      onMap: ['a', 'b'],
      offMap: ['c'],
    });
  });

  it('a card dropped onto another names that card; on empty map, none', () => {
    const nodes = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 400, y: 0 },
    ];
    expect(cardUnder(nodes, 'a', { x: 380, y: 10 })).toBe('b');
    expect(cardUnder(nodes, 'a', { x: 200, y: 300 })).toBeNull();
  });

  it('a place off the map is pulled back inside 0 to 4,000', () => {
    expect(clampPlace({ x: -20, y: 5000.4 })).toEqual({ x: 0, y: 4000 });
  });

  it('Fit shrinks a wide map to the region, never past full size', () => {
    expect(fitZoom(2000, 1000)).toBe(0.5);
    expect(fitZoom(500, 1000)).toBe(1);
    expect(fitZoom(10000, 1000)).toBe(0.4);
  });
});
