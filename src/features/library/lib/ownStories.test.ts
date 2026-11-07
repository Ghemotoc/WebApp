/**
 * Tests for ownStories (bundle NAV-1): the Library's My stories shelf leaves deleted stories out.
 */
import { describe, expect, it } from 'vitest';

import type { MyStory } from '@/features/writing/api/stories';

import { liveOwnStories } from './ownStories';

/** A story with only the fields the rule reads; the rest don't matter here. */
function storyWith(slug: string, deletedAt: string | null): MyStory {
  return { slug, deletedAt } as MyStory;
}

describe('liveOwnStories', () => {
  it('keeps drafts and published stories and leaves out a story deleted in the last 30 days', () => {
    const stories = [
      storyWith('draft', null),
      storyWith('deleted', '2026-11-01T10:00:00Z'),
      storyWith('published', null),
    ];
    expect(liveOwnStories(stories).map((story) => story.slug)).toEqual(['draft', 'published']);
  });

  it('gives an empty shelf to a writer with no stories', () => {
    expect(liveOwnStories([])).toEqual([]);
  });
});
