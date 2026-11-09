/**
 * Unit tests for the staff forum form's helpers (FORUMS-1a; S1-E8-01, first criterion).
 */
import { describe, expect, it } from 'vitest';

import type { StaffForum } from '../api/forumAdmin';

import { inTreeOrder, parentChoices, startingValues } from './forumForm';

/** A staff forum with sensible defaults. */
function forum(slug: string, changes: Partial<StaffForum> = {}): StaffForum {
  return {
    id: slug,
    parentId: null,
    level: 0,
    slug,
    position: 1,
    isPinned: false,
    accent: 'plum',
    names: { ro: { name: slug, description: '' } },
    missingLanguages: ['en'],
    ...changes,
  };
}

const forums = [
  forum('reading', { position: 2 }),
  forum('craft', { position: 1 }),
  forum('openings', { parentId: 'craft', level: 1 }),
  forum('fantasy', { parentId: 'openings', level: 2 }),
];

describe('the staff forum form', () => {
  it('lists forums category by category, each followed by what sits inside it', () => {
    expect(inTreeOrder(forums).map((entry) => entry.slug)).toEqual([
      'craft',
      'openings',
      'fantasy',
      'reading',
    ]);
  });

  it('never offers a subforum, or the forum itself, as a parent', () => {
    const choices = parentChoices(forums, 'openings').map((entry) => entry.slug);
    expect(choices).toEqual(['reading', 'craft']);
  });

  it('starts a new forum inside its parent with an empty name in each language', () => {
    const values = startingValues(null, 'craft');
    expect(values.parentId).toBe('craft');
    expect(Object.keys(values.names)).toEqual(['ro', 'en']);
  });

  it('starts a change from the forum’s own values, with the missing language empty', () => {
    const values = startingValues(forums[2] ?? null, null);
    expect(values.slug).toBe('openings');
    expect(values.names['en']).toEqual({ name: '', description: '' });
  });
});
