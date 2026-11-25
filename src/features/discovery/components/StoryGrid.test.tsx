/**
 * Unit tests for the ads in a long grid of stories (bundle G7e; Robert, 20 Nov 2026: "a banner
 * every two rows"; boards A05, A06 and A09): a banner across a whole row, never closer than 10
 * stories apart.
 */
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    appOnly: false,
    languages: [],
    translatorName: null,
  }));
}

/**
 * Draws the grid with a test banner, and reads what each list item holds, in order.
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
        ad={{ slot, isShortListAdded: true }}
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

/**
 * Makes the window answer media queries as if it were this wide, for the grid's cards a row.
 *
 * @param width - the window's width in px
 */
function windowAt(width: number): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: width >= Number(/min-width: (\d+)px/.exec(query)?.[1] ?? Infinity),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the ads in a grid of stories', () => {
  it('puts a banner after two rows of five on a computer, then after every two more', () => {
    windowAt(1440);
    const items = gridItems(30);
    expect(items.indexOf('ad')).toBe(10);
    expect(items.lastIndexOf('ad')).toBe(21);
    expect(items.filter((item) => item === 'ad')).toHaveLength(2);
  });

  it('keeps whole rows on a tablet: a banner after three rows of four', () => {
    windowAt(768);
    expect(gridItems(20).indexOf('ad')).toBe(12);
  });

  it('puts the banner after 10 stories on a phone, never closer', () => {
    windowAt(390);
    const items = gridItems(20);
    expect(items.indexOf('ad')).toBe(10);
    expect(items.filter((item) => item === 'ad')).toHaveLength(1);
  });

  it('draws the banner across the whole row', () => {
    windowAt(1440);
    gridItems(20);
    const banner = (screen.getAllByRole('list')[0] as HTMLElement).children[10];
    expect(banner).toHaveClass('col-span-full');
  });

  it('gives a short list its one ad after its last story', () => {
    expect(gridItems(3)).toEqual(['story', 'story', 'story', 'ad']);
  });

  it('keeps an empty place when the slot draws nothing, hidden so it takes no row', () => {
    const items = gridItems(10, <></>);
    expect(items.filter((item) => item === 'empty')).toHaveLength(1);
    expect((screen.getAllByRole('list')[0] as HTMLElement).children[10]).toHaveClass(
      'empty:hidden',
    );
  });
});
