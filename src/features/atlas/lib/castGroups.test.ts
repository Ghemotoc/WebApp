/**
 * Tests for groupCast and matchesFilter (story S1-E17-08). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { StoryCharacter } from '../api/characters';

import { groupCast, matchesFilter } from './castGroups';

/** A character with only what these tests need. */
function character(name: string, role: StoryCharacter['role'], alias = ''): StoryCharacter {
  return {
    id: name,
    name,
    role,
    gender: null,
    sheet: alias === '' ? {} : { also_known_as: alias },
    customValues: {},
    firstAppearance: null,
    picture: null,
    pictureAlt: '',
    mapPlace: null,
  };
}

const cast = [
  character('Ana', 'protagonist'),
  character('Ștefan', 'antagonist', 'Paznicul nopții'),
  character('Vali', 'supporting'),
  character('Zoe', 'protagonist'),
];

describe('groupCast', () => {
  it('groups the cast by role, in role order, leaving out empty groups', () => {
    const groups = groupCast(cast, '');
    expect(groups.map((group) => group.role)).toEqual(['protagonist', 'antagonist', 'supporting']);
    expect(groups[0]?.characters.map((one) => one.name)).toEqual(['Ana', 'Zoe']);
  });

  it('filters by name without minding accents or case', () => {
    expect(
      groupCast(cast, 'stef').flatMap((group) => group.characters.map((one) => one.name)),
    ).toEqual(['Ștefan']);
  });
});

describe('matchesFilter', () => {
  it('also matches "also known as"', () => {
    expect(matchesFilter(cast[1] as StoryCharacter, 'paznic')).toBe(true);
    expect(matchesFilter(cast[0] as StoryCharacter, 'paznic')).toBe(false);
  });
});
