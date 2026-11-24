/**
 * Tests for SaveWord (design books item 16, "Show what is inside"): the one word beside the
 * chapter's name says whether the chapter is saved, and stays out of the way before any change.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { SaveState } from '../hooks/useAutosave';
import { SaveWord } from './SaveWord';

/** Draws the word for one save state, in English. */
function renderWord(state: SaveState) {
  return renderWithProviders(<SaveWord state={state} />, 'en');
}

describe('SaveWord', () => {
  it('shows nothing before the writer changes anything', () => {
    const { container } = renderWord({ kind: 'idle' });
    expect(container).toBeEmptyDOMElement();
  });

  it('says "Saved" once the save has gone through', () => {
    renderWord({ kind: 'saved', at: new Date(), wordCount: 12 });
    expect(screen.getByText('Saved')).toHaveClass('text-ink-muted');
  });

  it('says "Saving…" while the save is on its way', () => {
    renderWord({ kind: 'saving' });
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('says "Saved on this device" while offline', () => {
    renderWord({ kind: 'offline' });
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
  });

  it('says "Not saved" in the warning colour when the save failed', () => {
    renderWord({ kind: 'failed' });
    expect(screen.getByText('Not saved')).toHaveClass('text-(--warning-text)');
  });
});
