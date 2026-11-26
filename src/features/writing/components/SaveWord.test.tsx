/**
 * Tests for SaveWord (design books item 16, "Show what is inside"; board D05, user story 5.5): the
 * few words in the editor's bar and at the foot of the paper say whether the chapter is saved, and
 * stay out of the way before any change.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { SaveState } from '../hooks/useAutosave';
import { SaveWord } from './SaveWord';

/** Draws the word for one save state, in English. */
function renderWord(state: SaveState, withTime = false) {
  return renderWithProviders(<SaveWord state={state} withTime={withTime} />, 'en');
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

  it('says "Saved at 14:02" at the foot of the paper, in the 24-hour clock', () => {
    renderWord({ kind: 'saved', at: new Date(2026, 10, 25, 14, 2), wordCount: 12 }, true);
    expect(screen.getByText('Saved at 14:02')).toHaveClass('text-ink-muted');
  });

  it('says "Not saved yet. Trying again" in the danger colour when the save failed', () => {
    renderWord({ kind: 'failed' });
    expect(screen.getByText('Not saved yet. Trying again')).toHaveClass('text-(--error-text)');
  });

  it('says "Not saved" in the danger colour after a conflict', () => {
    renderWord({ kind: 'conflict', serverVersion: 4 });
    expect(screen.getByText('Not saved')).toHaveClass('text-(--error-text)');
  });
});
