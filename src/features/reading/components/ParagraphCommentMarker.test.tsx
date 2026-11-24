/**
 * The comment marker beside a paragraph while the writer has paused new comments (bundle CALM-8;
 * IDEA-20261109-8; the design handover's Step 4, point 6: "Paragraph counts still open comments
 * for reading"): a count still opens its thread, a paragraph without comments has no button.
 */
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { ParagraphCounts } from '../api/paragraphComments';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

import { ParagraphCommentMarker } from './ParagraphCommentMarker';

/**
 * Draws the markers of paragraphs 1 (three comments) and 2 (none).
 *
 * @param commentsPausedUntil - when the writer's pause ends, or null
 */
function renderMarkers(commentsPausedUntil: string | null) {
  const counts: ParagraphCounts = {
    commentsEnabled: true,
    byParagraph: { 1: 3 },
    earlier: 0,
    commentsPausedUntil,
    parts: [],
  };
  const context = {
    address: { storySlug: 'statia-meteo-seed01', chapterCode: 'reace001' },
    counts,
    openPlace: null,
    setOpenPlace: vi.fn(),
    sidePanel: null,
    isOpenedByReader: false,
    isPoem: false,
    language: 'ro',
    panelQuote: null,
    openPanel: vi.fn(),
    hoverKey: null,
    setHoverKey: vi.fn(),
  };
  renderWithProviders(
    <ParagraphCommentsContext.Provider value={context}>
      <ParagraphCommentMarker block={1} />
      <ParagraphCommentMarker block={2} />
    </ParagraphCommentsContext.Provider>,
    'en',
  );
}

beforeEach(() => {
  // Friday 20 November 2026, 18:40 in Bucharest. Only the clock is faked.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T16:40:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ParagraphCommentMarker during a pause of new comments', () => {
  it('offers to comment on a paragraph without comments while comments are open', () => {
    renderMarkers(null);
    expect(screen.getByRole('button', { name: '3 comments on this paragraph' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Comment on this paragraph' })).toBeEnabled();
  });

  it('keeps the count for reading, and drops the button where nobody can start a thread', () => {
    renderMarkers('2026-11-21T16:40:00Z');
    expect(screen.getByRole('button', { name: '3 comments on this paragraph' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Comment on this paragraph' })).toBeNull();
  });

  it('offers to comment again once the pause has ended, before the job clears it', () => {
    renderMarkers('2026-11-20T16:35:00Z');
    expect(screen.getByRole('button', { name: 'Comment on this paragraph' })).toBeEnabled();
  });
});
