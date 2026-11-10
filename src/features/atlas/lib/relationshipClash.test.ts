/**
 * Unit tests for the clash check of "Add a relationship" (bundle G10 ATLAS, part b; handoff A5).
 */
import { describe, expect, it } from 'vitest';

import type { CharacterRelationship, RelationshipKind } from '../api/characters';

import { findClash, isAlreadyThere } from './relationshipClash';

/** A saved relationship with only what the check reads. */
function saved(fromId: string, kind: RelationshipKind, toId: string): CharacterRelationship {
  return {
    id: `${fromId}-${kind}-${toId}`,
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

const story = [saved('elena', 'parent_of', 'mara'), saved('mara', 'friend_of', 'teo')];

describe('findClash', () => {
  it('a sibling tie between a parent and child clashes, whichever way it is read', () => {
    expect(findClash(story, { fromId: 'mara', toId: 'elena', kind: 'sibling_of' })?.id).toBe(
      'elena-parent_of-mara',
    );
    expect(findClash(story, { fromId: 'elena', toId: 'mara', kind: 'cousin_of' })).not.toBeNull();
  });

  it('the same parent tie the other way round clashes', () => {
    expect(findClash(story, { fromId: 'mara', toId: 'elena', kind: 'parent_of' })).not.toBeNull();
  });

  it('a family tie next to a friendship or a conflict is fine', () => {
    expect(findClash(story, { fromId: 'mara', toId: 'teo', kind: 'sibling_of' })).toBeNull();
    expect(findClash(story, { fromId: 'mara', toId: 'elena', kind: 'resents' })).toBeNull();
  });

  it('a family tie between two other characters never clashes', () => {
    expect(findClash(story, { fromId: 'teo', toId: 'elena', kind: 'sibling_of' })).toBeNull();
  });
});

describe('isAlreadyThere', () => {
  it('the same relationship the same way round is already there', () => {
    expect(isAlreadyThere(story, { fromId: 'elena', toId: 'mara', kind: 'parent_of' })).toBe(true);
  });

  it('a parent the other way round is another relationship', () => {
    expect(isAlreadyThere(story, { fromId: 'mara', toId: 'elena', kind: 'parent_of' })).toBe(false);
  });

  it('a friendship reads the same from both sides', () => {
    expect(isAlreadyThere(story, { fromId: 'teo', toId: 'mara', kind: 'friend_of' })).toBe(true);
  });

  it('another type between the same two, and the writer\u2019s own words, are not', () => {
    expect(isAlreadyThere(story, { fromId: 'mara', toId: 'teo', kind: 'ally_of' })).toBe(false);
    expect(isAlreadyThere(story, { fromId: 'mara', toId: 'teo', kind: 'custom' })).toBe(false);
  });
});
