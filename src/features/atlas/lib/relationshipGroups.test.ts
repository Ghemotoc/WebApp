/**
 * Unit tests for the kinds of "Add a relationship" (bundle G10 ATLAS, part b; handoff A4).
 */
import { describe, expect, it } from 'vitest';

import { relationshipKinds } from '../api/characters';

import { groupOf, kindsInGroup, relationshipGroups } from './relationshipGroups';

describe('relationship kinds in the form', () => {
  it('every relationship type sits under exactly one kind', () => {
    const listed = relationshipGroups.flatMap((group) => kindsInGroup[group]);
    expect([...listed].sort()).toEqual([...relationshipKinds].sort());
  });

  it('a cousin and "Turned or made" are family, and own words are Other', () => {
    expect(groupOf('cousin_of')).toBe('family');
    expect(groupOf('made')).toBe('family');
    expect(groupOf('custom')).toBe('other');
  });
});
