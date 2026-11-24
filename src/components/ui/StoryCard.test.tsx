/**
 * Tests for StoryCard's new-chapter dot (design books item 16, "Show what is inside"): a Library
 * card shows a small dot on its cover when a chapter came out after the reader saved the story.
 */
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import { automaticCoverFor } from '@/components/covers/automaticCover';
import { renderWithProviders } from '@/test/renderWithProviders';

import { StoryCard } from './StoryCard';

/** Draws one card, with or without the dot. */
function renderCard(hasNewChapter?: boolean) {
  return renderWithProviders(
    <MemoryRouter>
      <StoryCard
        title="The Lantern Keeper"
        metaLine="@inkwolf · new chapter"
        cover={automaticCoverFor('00000000-0000-0000-0000-000000000001')}
        href="/s/lantern-keeper"
        hasNewChapter={hasNewChapter}
      />
    </MemoryRouter>,
    'en',
  );
}

describe('StoryCard', () => {
  it('shows a dot on the cover when a new chapter came out, hidden from screen readers', () => {
    const { container } = renderCard(true);
    const dot = container.querySelector('[data-new-chapter-dot]');
    expect(dot).not.toBeNull();
    // The meta line carries the words, so the dot is never the only cue (WCAG 1.4.1).
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no dot when nothing new came out', () => {
    const { container } = renderCard();
    expect(container.querySelector('[data-new-chapter-dot]')).toBeNull();
  });
});
