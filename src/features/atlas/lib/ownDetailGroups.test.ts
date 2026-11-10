/**
 * Tests for ownDetailGroups (bundle GAPS-1): the writer's own groups on a character sheet.
 */
import { describe, expect, it } from 'vitest';

import type { CharacterField } from '../api/characters';

import { ownDetailGroups } from './ownDetailGroups';

/** A detail with only what a test cares about set. */
function detail(name: string, ownGroup: string | null, isHidden = false): CharacterField {
  return { id: name, name, isHidden, sheetGroup: null, ownGroup };
}

describe('ownDetailGroups', () => {
  it('puts each detail in its group, in the order the groups were first used', () => {
    const groups = ownDetailGroups([
      detail('Wand', 'Magic'),
      detail('House', 'School'),
      detail('Familiar', 'Magic'),
    ]);
    expect(groups.map((group) => group.name)).toEqual(['Magic', 'School']);
    expect(groups[0]?.fields.map((field) => field.name)).toEqual(['Wand', 'Familiar']);
  });

  it('leaves out details with no group of the writer’s own', () => {
    expect(ownDetailGroups([detail('Lucky number', null)])).toEqual([]);
  });

  it('leaves out a group whose details are all removed, and keeps one with a detail left', () => {
    const groups = ownDetailGroups([
      detail('Wand', 'Magic', true),
      detail('House', 'School', true),
      detail('Year', 'School'),
    ]);
    expect(groups.map((group) => group.name)).toEqual(['School']);
  });
});
