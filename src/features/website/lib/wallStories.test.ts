/**
 * Tests for wallStories, the cover wall's pick of stories (bundle LOOK-2; brief LOOK-2: only
 * All ages and 13+ stories, at most six, in the Trending order).
 */
import { describe, expect, it } from 'vitest';

import type { ListedStory } from '@/features/discovery/api/storyLists';

import { wallStories } from './wallStories';

/**
 * One Trending story with the given rating.
 *
 * @param id - the story's ID, also used as its title
 * @param rating - its rating
 * @returns a story as the list gives it
 */
function story(id: string, rating: ListedStory['rating']): ListedStory {
  return {
    id,
    slug: id,
    title: id,
    blurb: '',
    writer: { handle: 'inkwolf', displayName: 'Ink Wolf', rank: null },
    categorySlug: 'fantasy',
    languageCode: 'ro',
    completionStatus: 'ongoing',
    rating,
    coverKind: 'automatic',
    drawnCover: null,
    chapterCount: 1,
    lastChapterPublishedAt: null,
    appOnly: false,
  };
}

describe('wallStories', () => {
  it('leaves out 16+ and 18+ stories, whoever is looking', () => {
    const picked = wallStories([
      story('a', 'all_ages'),
      story('b', '16_plus'),
      story('c', '13_plus'),
      story('d', '18_plus'),
    ]);
    expect(picked.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('keeps at most six stories, the first ones in the Trending order', () => {
    const trending = ['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => story(id, 'all_ages'));
    expect(wallStories(trending).map((item) => item.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('shows nothing rather than inventing covers when no story suits everyone', () => {
    expect(wallStories([story('x', '18_plus')])).toEqual([]);
  });
});
