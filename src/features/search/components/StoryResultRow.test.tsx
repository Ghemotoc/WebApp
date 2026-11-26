/**
 * Unit tests for one story row in the search results (user story 1.8, board A08-SearchResults:
 * "inkwolf · 18k reads · 15 chapters · completed today"): the reads and the last change join the
 * pen name and the chapters, and a list without reads leaves them out.
 */
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { renderWithProviders } from '@/test/renderWithProviders';

import { StoryResultRow } from './StoryResultRow';

/** A story as a search gives it, read 18,200 times, its last chapter out yesterday. */
const story: ListedStory = {
  id: 'story-1',
  slug: 'the-salt-mine-choir',
  title: 'The Salt Mine Choir',
  blurb: 'A choir rehearses in an old salt mine.',
  writer: { handle: 'inkwolf', displayName: 'inkwolf', rank: null },
  categorySlug: 'fantasy',
  languageCode: 'en',
  completionStatus: 'completed',
  rating: 'all_ages',
  coverKind: 'automatic',
  drawnCover: null,
  chapterCount: 15,
  lastChapterPublishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  reads: 18200,
  appOnly: false,
  languages: [],
  translatorName: null,
};

/** Any automatic cover; the row's words don't depend on it. */
const cover: DrawnCoverChoice = { design: 'waves', background: 'violet', accent: 'gold' };

/**
 * Draws one row in its list.
 *
 * @param shown - the story to draw
 */
function drawRow(shown: ListedStory) {
  renderWithProviders(
    <MemoryRouter>
      <ul>
        <StoryResultRow story={shown} cover={cover} />
      </ul>
    </MemoryRouter>,
    'en',
  );
}

describe('StoryResultRow', () => {
  it('shows the reads, the chapters and when the story last changed', () => {
    drawRow(story);
    expect(screen.getByText('18K reads')).toBeInTheDocument();
    expect(screen.getByText('15 chapters')).toBeInTheDocument();
    expect(screen.getByText(/^updated /)).toBeInTheDocument();
  });

  it('leaves the reads out on a list that doesn’t give them', () => {
    drawRow({ ...story, reads: null, lastChapterPublishedAt: null });
    expect(screen.queryByText(/reads?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^updated /)).not.toBeInTheDocument();
  });
});
