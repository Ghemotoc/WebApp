/**
 * Tests for SaveStatus (story S1-E3-02a; board D05, user story 5.5): the live region always says
 * how the save went, and shows on screen only when the writer must act.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { SaveState } from '../hooks/useAutosave';
import { SaveStatus } from './SaveStatus';

/** Draws the status line for one save state, in English. */
function renderStatus(state: SaveState) {
  return renderWithProviders(<SaveStatus state={state} />, 'en');
}

describe('SaveStatus', () => {
  it('says nothing before the first change, but stays so later changes are announced', () => {
    renderStatus({ kind: 'idle' });
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('tells a screen reader the time of a finished save without showing a box', () => {
    renderStatus({ kind: 'saved', at: new Date(2026, 10, 25, 14, 2), wordCount: 3 });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Saved at 14:02');
    expect(status).toHaveClass('sr-only');
  });

  it('shows a refused save in the danger colour, so the writer can press Retry', () => {
    renderStatus({ kind: 'failed' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/^Not saved yet\. Trying again/);
    expect(status).not.toHaveClass('sr-only');
    expect(status).toHaveClass('text-(--error-text)');
  });

  it('shows a conflict, so the writer can keep this version or compare', () => {
    renderStatus({ kind: 'conflict', serverVersion: 3 });
    expect(screen.getByRole('status')).not.toHaveClass('sr-only');
  });
});
