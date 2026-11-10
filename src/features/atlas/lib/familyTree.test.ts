/**
 * Tests for buildFamilyTree (story S1-E17-16). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { CharacterRelationship, RelationshipKind } from '../api/characters';

import { buildFamilyTree } from './familyTree';

/** A relationship with only what these tests need. */
function link(fromId: string, kind: RelationshipKind, toId: string): CharacterRelationship {
  return {
    id: `${fromId}-${toId}`,
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

const cast = ['ana', 'ion', 'vali', 'maria', 'stefan', 'nora'];
const relationships = [
  link('ana', 'partner_of', 'ion'),
  link('ana', 'parent_of', 'vali'),
  link('ion', 'parent_of', 'vali'),
  link('vali', 'parent_of', 'maria'),
  link('stefan', 'made', 'vali'),
  link('nora', 'friend_of', 'ana'),
];

describe('buildFamilyTree', () => {
  it('lays generations out top to bottom, partners side by side', () => {
    const tree = buildFamilyTree(cast, relationships, false);
    expect(tree.generations).toEqual([['ana', 'ion'], ['vali'], ['maria']]);
    expect(tree.parentLinks).toHaveLength(3);
    expect(tree.partnerLinks).toEqual([['ana', 'ion']]);
  });

  it('leaves characters with no family link off and counts them', () => {
    expect(buildFamilyTree(cast, relationships, false).leftOffCount).toBe(2);
  });

  it('counts makers as lineage when "Include turned or made" is on', () => {
    const tree = buildFamilyTree(cast, relationships, true);
    expect(tree.generations[0]).toContain('stefan');
    expect(tree.leftOffCount).toBe(1);
  });

  it('puts a partner in the lower of the two rows', () => {
    const tree = buildFamilyTree(
      ['a', 'b', 'c'],
      [link('a', 'parent_of', 'b'), link('b', 'partner_of', 'c')],
      false,
    );
    expect(tree.generations).toEqual([['a'], ['b', 'c']]);
  });

  it('stops on a loop instead of running forever', () => {
    const tree = buildFamilyTree(
      ['a', 'b'],
      [link('a', 'parent_of', 'b'), link('b', 'parent_of', 'a')],
      false,
    );
    expect(tree.generations.flat().sort()).toEqual(['a', 'b']);
  });

  it('draws nothing when there are no family links', () => {
    expect(buildFamilyTree(['a'], [], false)).toEqual({
      generations: [],
      parentLinks: [],
      partnerLinks: [],
      siblingLinks: [],
      cousinLinks: [],
      leftOffCount: 1,
    });
  });

  it('puts siblings in the same row, side by side', () => {
    const tree = buildFamilyTree(
      ['a', 'b', 'c', 'd'],
      [link('a', 'parent_of', 'b'), link('c', 'sibling_of', 'b'), link('a', 'partner_of', 'd')],
      false,
    );
    expect(tree.generations).toEqual([
      ['a', 'd'],
      ['b', 'c'],
    ]);
    expect(tree.siblingLinks).toEqual([['c', 'b']]);
  });

  it('puts a cousin removed that many rows below the first character', () => {
    const cousin = { ...link('a', 'cousin_of', 'b'), cousinDegree: 1, cousinRemoved: 1 };
    const tree = buildFamilyTree(['a', 'b'], [cousin], false);
    expect(tree.generations).toEqual([['a'], ['b']]);
    expect(tree.cousinLinks).toEqual([{ fromId: 'a', toId: 'b', removed: 1 }]);
  });

  it("shows only one character's family when a character is chosen", () => {
    const tree = buildFamilyTree(
      ['a', 'b', 'c', 'd', 'e'],
      [link('a', 'parent_of', 'b'), link('c', 'partner_of', 'd')],
      false,
      'd',
    );
    expect(tree.generations.flat().sort()).toEqual(['c', 'd']);
    // Left off still counts only the characters with no family link at all.
    expect(tree.leftOffCount).toBe(1);
  });
});
