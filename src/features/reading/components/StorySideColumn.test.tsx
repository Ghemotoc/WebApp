/**
 * The "Comments" row beside the story (story S1-E3-05; bundle CALM-8): Off, On, or while the
 * writer has paused new comments, until when, in the reader's own local time (CALM-8b), so a reader knows before opening a
 * chapter.
 */
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportedLanguage } from '@/lib/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';
import { inTimeZone, pinViewerTimeZone } from '@/test/viewerTimeZone';

import type { StoryPageData } from '../api/storyPage';

import { StorySideColumn } from './StorySideColumn';

// The column's other parts read the database; this test is about the label rows only.
vi.mock('@/features/people/components/FollowButton', () => ({ FollowButton: () => null }));
vi.mock('@/features/forums/components/ProfileRankChip', () => ({ ProfileRankChip: () => null }));
vi.mock('@/features/reporting/components/ReportButton', () => ({ ReportButton: () => null }));
vi.mock('./StoryLanguageNote', () => ({ AboutEditionCard: () => null }));

/**
 * A published story in one language, with comments on and no pause unless a test says otherwise.
 *
 * @param changes - what the test changes
 * @returns the story page's data
 */
function storyWith(changes: Partial<StoryPageData>): StoryPageData {
  return {
    id: '00000000-0000-4000-9000-000000000001',
    slug: 'statia-meteo-seed01',
    title: 'Stația meteo',
    blurb: 'O bunică notează vremea.',
    languageCode: 'ro',
    categorySlug: 'literary',
    tags: [],
    completionStatus: 'ongoing',
    commentsEnabled: true,
    commentsPausedUntil: null,
    coverKind: 'automatic',
    drawnCover: null,
    writer: { displayName: 'Ana', handle: 'ana', bio: '', classicAuthor: null },
    firstPublishedAt: '2026-11-01T10:00:00Z',
    lastChapterPublishedAt: '2026-11-01T10:00:00Z',
    isOwner: false,
    isPublic: true,
    appOnly: false,
    chapters: [],
    editions: [],
    edition: null,
    stats: { likes: 0, comments: 0 },
    labels: {
      rating: 'all_ages',
      isFanFiction: false,
      isParody: false,
      dealsWithAbuseOrCoercion: false,
      contentNote: '',
      aiDisclosure: 'no_ai',
      aiUndisclosedLabelled: false,
    },
    ...changes,
  };
}

/**
 * Draws the column and reads the Comments row's value.
 *
 * @param story - the story page's data
 * @param language - the interface language
 * @returns the row's value as text
 */
function commentsRowOf(story: StoryPageData, language: SupportedLanguage) {
  renderWithProviders(
    <MemoryRouter>
      <StorySideColumn story={story} />
    </MemoryRouter>,
    language,
  );
  const label = screen.getByText(language === 'en' ? 'Comments' : 'Comentarii');
  return label.nextElementSibling?.textContent;
}

describe('StorySideColumn, the Comments row', () => {
  // A reader in Stockholm, an hour behind Romania in November.
  pinViewerTimeZone('Europe/Stockholm');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Friday 20 November 2026, 17:40 in Stockholm.
    vi.setSystemTime(new Date('2026-11-20T16:40:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('says On while comments are open', () => {
    expect(commentsRowOf(storyWith({}), 'en')).toBe('On');
  });

  it('says Off when the writer turned comments off', () => {
    expect(commentsRowOf(storyWith({ commentsEnabled: false }), 'en')).toBe('Off');
  });

  it("says until when new comments are paused, in the reader's own time", () => {
    const story = storyWith({ commentsPausedUntil: '2026-11-21T16:40:00Z' });
    expect(commentsRowOf(story, 'en')).toBe('Paused until Saturday 21 November, 17:40');
  });

  it('gives a reader in New York the time on their own clock', () => {
    const story = storyWith({ commentsPausedUntil: '2026-11-21T16:40:00Z' });
    inTimeZone('America/New_York', () => {
      expect(commentsRowOf(story, 'en')).toBe('Paused until Saturday 21 November, 11:40');
    });
  });

  it('says it in Romanian with the date written the Romanian way', () => {
    const story = storyWith({ commentsPausedUntil: '2026-11-21T16:40:00Z' });
    expect(commentsRowOf(story, 'ro')).toBe('Oprite până sâmbătă, 21 noiembrie, 17:40');
  });

  it('says On again once the pause has ended, even before the page is read again', () => {
    const story = storyWith({ commentsPausedUntil: '2026-11-20T16:39:00Z' });
    expect(commentsRowOf(story, 'en')).toBe('On');
  });
});
