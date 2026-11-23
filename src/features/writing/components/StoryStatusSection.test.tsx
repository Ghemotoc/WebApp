/**
 * "Pause new comments" sits under Who can comment in Story settings and isn't offered with Nobody
 * (bundle CALM-8; IDEA-20261109-8; the design handover's Step 4, points 1 and 4).
 */
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { StoryAnswers } from '../hooks/storyAnswers';

import { StoryStatusSection } from './StoryStatusSection';

/** A story with comments on for everyone, as its settings form starts. */
const answersWithComments: StoryAnswers = {
  storyId: '00000000-0000-4000-8000-000000000001',
  title: 'Stația meteo',
  blurb: '',
  languageCode: 'ro',
  categorySlug: 'fiction',
  tags: [],
  cover: { kind: 'automatic' },
  completionStatus: 'ongoing',
  visibility: 'public',
  isAppOnly: false,
  hiddenInCountries: [],
  setInCountries: [],
  commentsEnabled: true,
  commentAudience: 'everyone',
  commentPause: null,
  quoteCardsEnabled: true,
  pictureSharingEnabled: true,
  cardColour: null,
  rating: null,
  isFanFiction: false,
  isParody: false,
  dealsWithAbuseOrCoercion: false,
  contentNote: '',
  aiDisclosure: null,
  ratingReasons: [],
};

/** The section with its answers kept, as the settings form keeps them. */
function SectionWithAnswers({ first }: { first: StoryAnswers }) {
  const [answers, setAnswers] = useState(first);
  return (
    <StoryStatusSection
      answers={answers}
      set={(field, value) => setAnswers((current) => ({ ...current, [field]: value }))}
      pausedUntil={null}
    />
  );
}

/** The pause switch, or null when the section leaves it out. */
function pauseSwitch() {
  return screen.queryByRole('switch', { name: 'Pause new comments' });
}

describe('StoryStatusSection: pausing new comments', () => {
  it('offers the pause while comments are on', () => {
    renderWithProviders(<SectionWithAnswers first={answersWithComments} />, 'en');
    expect(pauseSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('leaves the pause out once Who can comment is Nobody: there is nothing to pause', () => {
    renderWithProviders(<SectionWithAnswers first={answersWithComments} />, 'en');
    fireEvent.click(screen.getByRole('radio', { name: /Nobody/ }));
    expect(pauseSwitch()).toBeNull();
  });

  it('leaves the pause out for a story saved with comments off', () => {
    renderWithProviders(
      <SectionWithAnswers first={{ ...answersWithComments, commentsEnabled: false }} />,
      'en',
    );
    expect(pauseSwitch()).toBeNull();
  });
});
