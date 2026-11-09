/**
 * Unit tests for the ads in a long grid of stories (bundle G7e; Robert's design rules, 7 Nov 2026,
 * "Content rules": the first ad sits high on a list page, then one comes after every 10 stories).
 */
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { ListedStory } from '../api/storyLists';

import { StoryGrid } from './StoryGrid';

/**
 * A list of stories as the list gives them.
 *
 * @param count - how many
 * @returns the stories, titled "Story 1", "Story 2", …
 */
function storiesOf(count: number): ListedStory[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `story-${index + 1}`,
    slug: `story-${index + 1}`,
    title: `Story ${index + 1}`,
    blurb: '',
    writer: { handle: 'inkwolf', displayName: 'Ink Wolf', rank: null },
    categorySlug: 'fantasy',
    languageCode: 'ro',
    completionStatus: 'ongoing',
    rating: 'all_ages',
    coverKind: 'automatic',
    drawnCover: null,
    chapterCount: 1,
    lastChapterPublishedAt: null,
  }));
}

/**
 * Draws the grid with a card-sized test ad, and reads what each list item holds, in order.
 *
 * @param count - how many stories
 * @param slot - what the ad slot draws
 * @returns "ad", "empty" or "story" for each of the grid's own items
 */
function gridItems(count: number, slot = <p>An ad</p>): string[] {
  renderWithProviders(
    <MemoryRouter>
      <StoryGrid
        stories={storiesOf(count)}
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={() => undefined}
        ad={{ slot, firstAfter: 4, spansRow: false }}
      />
    </MemoryRouter>,
    'en',
  );
  const grid = screen.getAllByRole('list')[0] as HTMLElement;
  return Array.from(grid.children).map((item) => {
    if (item.textContent === 'An ad') return 'ad';
    if (item.textContent === '') return 'empty';
    return 'story';
  });
}

describe('the ads in a grid of stories', () => {
  it('puts the first ad high, after the 4th story, and the next after 10 more', () => {
    const items = gridItems(20);
    expect(items.indexOf('ad')).toBe(4);
    expect(items.lastIndexOf('ad')).toBe(15);
    expect(items.filter((item) => item === 'ad')).toHaveLength(2);
  });

  it('never ends the list on an ad, and a short list has none', () => {
    expect(gridItems(4).filter((item) => item === 'ad')).toHaveLength(0);
  });

  it('keeps an empty place when the slot draws nothing, hidden so it takes no cell', () => {
    const items = gridItems(10, <></>);
    expect(items.filter((item) => item === 'empty')).toHaveLength(1);
    expect((screen.getAllByRole('list')[0] as HTMLElement).children[4]).toHaveClass('empty:hidden');
  });
});
