/**
 * Tests for povLanes.ts: the lanes' columns, with the Narrator last (bundle G10 ATLAS, part c2).
 */
import { describe, expect, it } from 'vitest';

import type { StorylineChapter } from '../api/storyline';

import { narratorValue } from './pointOfView';
import { isToldBy, laneTellers } from './povLanes';

/** A chapter told by a character, by the Narrator or by nobody. */
function chapter(code: string, teller: string | null): StorylineChapter {
  return {
    code,
    position: 0,
    title: code,
    status: 'draft',
    kind: 'chapter',
    planningStatus: 'idea',
    povCharacterId: teller === narratorValue ? null : teller,
    povIsNarrator: teller === narratorValue,
    actId: null,
    wordCount: 0,
    wordTarget: null,
    worldDate: '',
    worldSort: null,
  };
}

const cast = [
  { id: 'ana', name: 'Ana' },
  { id: 'bogdan', name: 'Bogdan' },
  { id: 'calin', name: 'Călin' },
];

describe('the point-of-view lanes', () => {
  it('there is a column for each character who tells a chapter, in the cast’s order', () => {
    const tellers = laneTellers(cast, [chapter('one', 'bogdan'), chapter('two', 'ana')]);
    expect(tellers).toEqual([
      { id: 'ana', name: 'Ana' },
      { id: 'bogdan', name: 'Bogdan' },
    ]);
  });

  it('the Narrator gets the last column once they tell a chapter', () => {
    const tellers = laneTellers(cast, [chapter('one', narratorValue), chapter('two', 'ana')]);
    expect(tellers).toEqual([
      { id: 'ana', name: 'Ana' },
      { id: narratorValue, name: null },
    ]);
  });

  it('a story told only by the Narrator still has lanes', () => {
    expect(laneTellers(cast, [chapter('one', narratorValue)])).toEqual([
      { id: narratorValue, name: null },
    ]);
  });

  it('a chapter’s mark goes in its teller’s column only', () => {
    expect(isToldBy(chapter('one', 'ana'), 'ana')).toBe(true);
    expect(isToldBy(chapter('one', 'ana'), narratorValue)).toBe(false);
    expect(isToldBy(chapter('one', narratorValue), narratorValue)).toBe(true);
    expect(isToldBy(chapter('one', null), 'ana')).toBe(false);
  });
});
