/**
 * "Who can read this story?" in Story settings, as board D07 draws it (BOOKS D07, user story
 * 5.7): Visibility as three radio rows with their lines, and App only as a switch.
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { StoryAnswers } from '../hooks/storyAnswers';

import { StoryWhoCanReadSection } from './StoryWhoCanReadSection';

/** The card for a public story on the web, with the answer setter spied on. */
function renderCard(changes: Partial<Pick<StoryAnswers, 'visibility' | 'isAppOnly'>> = {}) {
  const set = vi.fn();
  const answers = { visibility: 'public', isAppOnly: false, ...changes } as StoryAnswers;
  renderWithProviders(<StoryWhoCanReadSection answers={answers} set={set} />, 'en');
  return set;
}

describe('StoryWhoCanReadSection (board D07)', () => {
  it('shows Visibility as three radios, each named plainly and described by its line', () => {
    renderCard();
    const group = screen.getByRole('group', { name: 'Visibility' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Public' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Unlisted' })).toHaveAccessibleDescription(
      /^Only people with the link can read it\./,
    );
    expect(screen.getByRole('radio', { name: 'Private' })).not.toBeChecked();
  });

  it('picking Unlisted saves that answer', () => {
    const set = renderCard();
    fireEvent.click(screen.getByRole('radio', { name: 'Unlisted' }));
    expect(set).toHaveBeenCalledWith('visibility', 'unlisted');
  });

  it('App only is a switch that starts off and says nothing changes before the apps', () => {
    const set = renderCard();
    const appOnly = screen.getByRole('switch', { name: 'App only' });
    expect(appOnly).toHaveAttribute('aria-checked', 'false');
    expect(appOnly).toHaveAccessibleDescription(/aren’t out yet/);
    fireEvent.click(appOnly);
    expect(set).toHaveBeenCalledWith('isAppOnly', true);
  });
});
