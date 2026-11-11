/**
 * The rules walkthrough's cards (bundle MUST-1, part c; IDEA-20261108-7).
 * Who runs it: `npm test`. What it proves: one card at a time with Next and Back, a way to skip
 * on every card but the last, Done on the last, both recording it and handing the focus back, and
 * a link to the full community guidelines that opens in a new tab so nothing typed is lost.
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { RulesWalkthroughState } from '../hooks/useRulesWalkthrough';

import { RulesWalkthrough } from './RulesWalkthrough';

/** Four cards, as the CMS gives them. */
const cards = [
  {
    key: 'rules-walkthrough-1-kindness',
    title: 'Be kind',
    body: 'About the writing.',
    language: 'en',
  },
  {
    key: 'rules-walkthrough-2-privacy',
    title: 'Keep it private',
    body: 'No phone.',
    language: 'en',
  },
  { key: 'rules-walkthrough-3-ratings', title: 'Ratings', body: 'Pick one.', language: 'en' },
  { key: 'rules-walkthrough-4-report', title: 'Report', body: 'Every item.', language: 'en' },
];

/** An open walkthrough whose finish() is a spy. */
function openWalkthrough(): RulesWalkthroughState {
  return { isShown: true, cards, shouldHold: () => true, finish: vi.fn() };
}

describe('the rules walkthrough', () => {
  it('shows one card at a time, and Next and Back move between them', () => {
    renderWithProviders(
      <RulesWalkthrough walkthrough={openWalkthrough()} onClosed={vi.fn()} />,
      'en',
    );
    expect(screen.getByRole('heading', { name: 'Be kind' })).toHaveFocus();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Keep it private' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Be kind' })).toBeInTheDocument();
  });

  it('can be skipped from the first card, which records it and hands the focus back', () => {
    const walkthrough = openWalkthrough();
    const onClosed = vi.fn();
    renderWithProviders(<RulesWalkthrough walkthrough={walkthrough} onClosed={onClosed} />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Skip the rules' }));
    expect(walkthrough.finish).toHaveBeenCalledOnce();
    expect(onClosed).toHaveBeenCalledOnce();
  });

  it('ends with Done on the last card, with no skip left', () => {
    const walkthrough = openWalkthrough();
    renderWithProviders(<RulesWalkthrough walkthrough={walkthrough} onClosed={vi.fn()} />, 'en');
    for (let press = 0; press < 3; press += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByText('4 of 4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip the rules' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(walkthrough.finish).toHaveBeenCalledOnce();
  });

  it('links to the full community guidelines in a new tab, so the box keeps its words', () => {
    renderWithProviders(
      <RulesWalkthrough walkthrough={openWalkthrough()} onClosed={vi.fn()} />,
      'en',
    );
    const link = screen.getByRole('link', { name: 'Community guidelines (opens in a new tab)' });
    expect(link).toHaveAttribute('href', '/legal/guidelines');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows nothing while closed', () => {
    const closed = { ...openWalkthrough(), isShown: false };
    renderWithProviders(<RulesWalkthrough walkthrough={closed} onClosed={vi.fn()} />, 'en');
    expect(screen.queryByRole('group')).toBeNull();
  });
});
