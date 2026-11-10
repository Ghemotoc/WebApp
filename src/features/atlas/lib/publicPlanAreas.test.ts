/**
 * Tests for lib/publicPlanAreas.ts: the public areas' addresses and the readers' link targets
 * (stories S1-E17-32 and S1-E17-33). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { PublicPlan } from '../api/publicPlan';

import { areaFromPath, publicLinkTargets, publicTargetAddress } from './publicPlanAreas';

const plan: PublicPlan = {
  storySlug: 'farul',
  storyTitle: 'Farul',
  areas: ['characters', 'bible'],
  cast: {
    storyId: '',
    storyTitle: 'Farul',
    characters: [
      {
        id: 'ana',
        name: 'Ana',
        role: 'protagonist',
        gender: null,
        sheet: { also_known_as: 'Ani, , Paznica' },
        customValues: {},
        firstAppearance: null,
        picture: null,
        pictureAlt: '',
        mapPlace: null,
      },
    ],
    fields: [],
    chapters: [],
    relationships: [],
  },
  characterGuards: {},
  sections: [
    {
      id: 's1',
      preset: 'world',
      name: '',
      entries: [{ id: 'e1', title: 'Farul', tags: [], body: '', showFrom: null }],
    },
  ],
  events: [],
  chapters: [
    { code: 'abcd1234', title: 'Furtuna' },
    { code: 'abcd5678', title: '' },
  ],
};

describe('areaFromPath', () => {
  it('reads each area from its address and nothing else', () => {
    expect(areaFromPath('map')).toBe('relationship_map');
    expect(areaFromPath('family-tree')).toBe('family_tree');
    expect(areaFromPath('world')).toBe('bible');
    expect(areaFromPath('drafts')).toBeNull();
    expect(areaFromPath(undefined)).toBeNull();
  });
});

describe('publicLinkTargets', () => {
  it('lists shown characters with their open aliases, public entries and titled chapters', () => {
    expect(
      publicLinkTargets(plan).map((target) => `${target.kind}:${target.names.join('|')}`),
    ).toEqual(['character:Ana|Ani|Paznica', 'entry:Farul', 'chapter:Furtuna']);
  });
});

describe('publicTargetAddress', () => {
  const [character, entry, chapter] = publicLinkTargets(plan);

  it("opens a character's page, an entry in the world and a chapter in the reader", () => {
    expect(character && publicTargetAddress(character, plan, '/s/farul/atlas')).toBe(
      '/s/farul/atlas/characters/ana',
    );
    expect(entry && publicTargetAddress(entry, plan, '/s/farul/atlas')).toBe(
      '/s/farul/atlas/world#atlas-world-entry-e1',
    );
    expect(chapter && publicTargetAddress(chapter, plan, '/s/farul/atlas')).toBe(
      '/s/farul/abcd1234',
    );
  });

  it('gives a character no address while Characters is off', () => {
    const withoutCharacters = { ...plan, areas: ['relationship_map' as const] };
    expect(
      character && publicTargetAddress(character, withoutCharacters, '/s/farul/atlas'),
    ).toBeNull();
  });
});
