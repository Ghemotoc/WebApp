/**
 * Tests for the relationship map's layout (story S1-E17-15; user stories bundle 6, story 6.6:
 * "the map places people by family and circle"). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { CharacterRelationship, RelationshipKind } from '../api/characters';

import { layoutRelationshipMap, splitMapCast } from './relationshipMap';

/** A relationship with only what these tests need. */
function link(
  id: string,
  fromId: string,
  toId: string,
  kind: RelationshipKind = 'friend_of',
): CharacterRelationship {
  return {
    id,
    fromId,
    toId,
    kind,
    customLabel: '',
    reverseLabel: '',
    cousinDegree: null,
    cousinRemoved: null,
    note: '',
  };
}

/** Each card's place, by ID, for short assertions; a missing card fails the test. */
function placesOf(ids: string[], relationships: CharacterRelationship[]) {
  const layout = layoutRelationshipMap(ids, relationships, relationships);
  return {
    get(id: string): { x: number; y: number } {
      const node = layout.nodes.find((candidate) => candidate.id === id);
      if (node === undefined) throw new Error(`${id} is not on the map`);
      return node;
    },
  };
}

/** Board E25's story, cut down: grandparents, parents, a child, her friend and the choir leader. */
const saltMine = [
  link('1', 'ana', 'ion', 'partner_of'),
  link('2', 'ion', 'elena', 'parent_of'),
  link('3', 'elena', 'mihai', 'partner_of'),
  link('4', 'elena', 'mara', 'parent_of'),
  link('5', 'mihai', 'mara', 'parent_of'),
  link('6', 'mara', 'teo', 'friend_of'),
  link('7', 'mara', 'dobre', 'resents'),
];
const saltMineIds = ['ana', 'dobre', 'elena', 'ion', 'mara', 'mihai', 'teo'];

describe('layoutRelationshipMap', () => {
  it('puts parents a row above their children and partners on the same row', () => {
    const places = placesOf(saltMineIds, saltMine);
    expect(places.get('ana').y).toBe(places.get('ion').y);
    expect(places.get('elena').y).toBeGreaterThan(places.get('ion').y);
    expect(places.get('mihai').y).toBe(places.get('elena').y);
    expect(places.get('mara').y).toBeGreaterThan(places.get('elena').y);
  });

  it('puts the circle to the right of the family, on the row of the people they know', () => {
    const places = placesOf(saltMineIds, saltMine);
    const familyRight = Math.max(
      ...['ana', 'ion', 'elena', 'mihai', 'mara'].map((id) => places.get(id).x),
    );
    expect(places.get('teo').x).toBeGreaterThan(familyRight);
    expect(places.get('teo').y).toBe(places.get('mara').y);
    expect(places.get('dobre').y).toBe(places.get('mara').y);
  });

  it('keeps every card in place when a category is switched off', () => {
    const everything = layoutRelationshipMap(saltMineIds, saltMine, saltMine);
    const familyOnly = layoutRelationshipMap(
      saltMineIds,
      saltMine,
      saltMine.filter((relationship) => relationship.kind !== 'friend_of'),
    );
    expect(familyOnly.nodes).toEqual(everything.nodes);
    expect(familyOnly.edges).toHaveLength(everything.edges.length - 1);
  });

  it('fills rows of four when nobody is family', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const places = placesOf(ids, [link('1', 'a', 'b'), link('2', 'c', 'd'), link('3', 'd', 'e')]);
    expect(places.get('a').y).toBe(places.get('d').y);
    expect(places.get('e').y).toBeGreaterThan(places.get('a').y);
    expect(places.get('e').x).toBe(places.get('a').x);
  });

  it('draws a pair’s only line straight and bends two lines between the same pair apart', () => {
    const one = layoutRelationshipMap(['a', 'b'], [link('1', 'a', 'b')], [link('1', 'a', 'b')]);
    const [only] = one.edges;
    // A straight line's control point is its middle.
    const numbers = (only?.path ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const [startX = 0, , controlX = 0, , endX = 0] = numbers;
    expect(controlX).toBe((startX + endX) / 2);
    const two = [link('1', 'a', 'b'), link('2', 'b', 'a', 'enemy_of')];
    const bent = layoutRelationshipMap(['a', 'b'], two, two);
    expect(bent.edges[0]?.path).not.toBe(bent.edges[1]?.path);
  });

  it('sizes the map to hold every card', () => {
    const layout = layoutRelationshipMap(saltMineIds, saltMine, saltMine);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThan(layout.width);
      expect(node.y).toBeLessThan(layout.height);
    }
  });
});

describe('splitMapCast', () => {
  it('leaves characters without a relationship off the map, keeping the cast’s order', () => {
    expect(splitMapCast(['ana', 'ion', 'vali'], [link('1', 'vali', 'ana')])).toEqual({
      onMap: ['ana', 'vali'],
      offMap: ['ion'],
    });
  });
});
