/**
 * Tests for lib/ideaFilters.ts: the Open, Done and All filter (S1-E17-28).
 */
import { describe, expect, it } from 'vitest';

import type { StoryIdea } from '../api/ideas';

import { filterIdeas } from './ideaFilters';

/** A note, done or open. */
function note(id: string, doneAt: string | null): StoryIdea {
  return { id, kind: 'idea', body: id, outcome: '', doneAt, createdAt: '2026-10-31T10:00:00Z' };
}

const notes = [note('a', null), note('b', '2026-10-31T11:00:00Z'), note('c', null)];

describe('filterIdeas', () => {
  it('shows only the open notes under Open', () => {
    expect(filterIdeas(notes, 'open').map((each) => each.id)).toEqual(['a', 'c']);
  });

  it('shows only the ticked notes under Done', () => {
    expect(filterIdeas(notes, 'done').map((each) => each.id)).toEqual(['b']);
  });

  it('shows every note under All, in the same order', () => {
    expect(filterIdeas(notes, 'all').map((each) => each.id)).toEqual(['a', 'b', 'c']);
  });
});
