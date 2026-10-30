/**
 * Unit tests for the rank badge pick rules (CMS-1g).
 */
import { describe, expect, it } from 'vitest';

import { pickedTags, togglePick } from './rankPick';

describe('togglePick', () => {
  it('adds a tag at the end of the pick', () => {
    expect(togglePick(['Fantasy'], 'Romance', true)).toEqual(['Fantasy', 'Romance']);
  });

  it('a fourth tag is not added, because a cover shows 3 badges', () => {
    expect(togglePick(['A', 'B', 'C'], 'D', true)).toEqual(['A', 'B', 'C']);
  });

  it('switching a tag off takes it out', () => {
    expect(togglePick(['A', 'B'], 'A', false)).toEqual(['B']);
  });

  it('a tag already picked is not added twice', () => {
    expect(togglePick(['A'], 'A', true)).toEqual(['A']);
  });
});

describe('pickedTags', () => {
  it('lists the picked tags in the story order', () => {
    const rank = { rank: 1, outOf: 9, isBadge: true };
    expect(
      pickedTags([
        { ...rank, tagName: 'A', isPicked: false },
        { ...rank, tagName: 'B', isPicked: true },
        { ...rank, tagName: 'C', isPicked: true },
      ]),
    ).toEqual(['B', 'C']);
  });
});
