/**
 * Unit tests for "Add to this tree" (bundle GAPS-3): each answer becomes the right relationship,
 * the right way round.
 */
import { describe, expect, it } from 'vitest';

import { relationshipForTree, type TreeAddition } from './treeAdditions';

/** Corina added to Mara's tree, as a first cousin unless the test says otherwise. */
const addition: TreeAddition = {
  anchorId: 'mara',
  otherId: 'corina',
  relation: 'cousin',
  cousinDegree: 2,
  cousinRemoved: 1,
  note: '',
};

describe('relationshipForTree', () => {
  it('a parent is the parent of the tree’s character', () => {
    expect(relationshipForTree({ ...addition, relation: 'parent' })).toMatchObject({
      fromId: 'corina',
      toId: 'mara',
      kind: 'parent_of',
    });
  });

  it('a child has the tree’s character as its parent', () => {
    expect(relationshipForTree({ ...addition, relation: 'child' })).toMatchObject({
      fromId: 'mara',
      toId: 'corina',
      kind: 'parent_of',
    });
  });

  it('a sibling and a partner start with the added character', () => {
    expect(relationshipForTree({ ...addition, relation: 'sibling' })).toMatchObject({
      fromId: 'corina',
      toId: 'mara',
      kind: 'sibling_of',
    });
    expect(relationshipForTree({ ...addition, relation: 'partner' }).kind).toBe('partner_of');
  });

  it('a cousin keeps which cousin and how far removed', () => {
    expect(relationshipForTree(addition)).toMatchObject({
      kind: 'cousin_of',
      cousinDegree: 2,
      cousinRemoved: 1,
    });
  });

  it('only a cousin carries a degree, and the note is kept', () => {
    const saved = relationshipForTree({ ...addition, relation: 'sibling', note: 'Half-sisters' });
    expect(saved.cousinDegree).toBeNull();
    expect(saved.cousinRemoved).toBeNull();
    expect(saved.note).toBe('Half-sisters');
  });
});
