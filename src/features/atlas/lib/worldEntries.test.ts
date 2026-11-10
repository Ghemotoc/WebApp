/**
 * Unit tests for the readers' world pages' helpers (GAPS-4): finding a public entry and the
 * "More from the world" list.
 */
import { describe, expect, it } from 'vitest';

import type { PublicPlan, PublicSection } from '../api/publicPlan';

import { findPublicEntry, moreFromWorld, moreFromWorldLimit } from './worldEntries';

/** A section with entries named by their IDs. */
function section(id: string, entryIds: string[]): PublicSection {
  return {
    id,
    preset: null,
    name: `Section ${id}`,
    entries: entryIds.map((entryId) => ({
      id: entryId,
      title: `Entry ${entryId}`,
      tags: [],
      body: '',
      showFrom: null,
    })),
  };
}

/** A plan holding only the world's sections: the helpers read nothing else. */
function planWith(sections: PublicSection[]): PublicPlan {
  return { sections } as PublicPlan;
}

const plan = planWith([section('places', ['mine', 'lift']), section('words', ['song', 'salt'])]);

describe('findPublicEntry', () => {
  it('finds an entry with the section it sits in', () => {
    const found = findPublicEntry(plan, 'song');
    expect(found?.entry.title).toBe('Entry song');
    expect(found?.section.id).toBe('words');
  });

  it('answers null for an entry readers can’t see', () => {
    expect(findPublicEntry(plan, 'private')).toBeNull();
  });
});

describe('moreFromWorld', () => {
  it('lists the same section’s entries first, then the rest, without the open one', () => {
    const ids = moreFromWorld(plan, 'salt').map((placed) => placed.entry.id);
    expect(ids).toEqual(['song', 'mine', 'lift']);
  });

  it('is empty when the open entry is the only one', () => {
    expect(moreFromWorld(planWith([section('places', ['mine'])]), 'mine')).toEqual([]);
  });

  it('stops at the limit', () => {
    const many = Array.from({ length: 20 }, (_, index) => `entry-${String(index)}`);
    const list = moreFromWorld(planWith([section('places', many)]), 'entry-0');
    expect(list).toHaveLength(moreFromWorldLimit);
  });
});
