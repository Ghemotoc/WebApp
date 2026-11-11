/**
 * The chapter reader's ad slot (story S1-E4-01b; S1-E4-01 criterion: "the banner slot sits only
 * below the chapter text, never inside it"; S1-E12-01, filled by page_ads() since SPONSORS-a1).
 */
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageAdSlot } from '@/schemas/ads';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { ReaderChapter } from '../api/chapter';

import { ChapterReaderPage } from './ChapterReaderPage';

/** A published chapter with two paragraphs. */
const chapter: ReaderChapter = {
  story: {
    slug: 'statia-meteo',
    title: 'Stația meteo',
    languageCode: 'ro',
    writer: { displayName: 'Lia Scrie', handle: 'lia' },
  },
  id: '7d1c5e4a-0000-4000-a000-000000000001',
  code: 'abcdefgh',
  title: 'Caietele bunicii',
  number: 1,
  total: 2,
  previousCode: null,
  nextCode: 'ijklmnop',
  publishedAt: '2026-10-09T09:00:00Z',
  editedAt: null,
  minutesToRead: 3,
  isOwner: false,
  needsSignIn: false,
  isTeaser: false,
  appOnly: false,
  isPoem: false,
  textContinues: false,
  body: 'Primul paragraf.\n\nAl doilea paragraf.',
  pictures: {},
  embeds: {},
};

/** What page_ads() answers for the chapter page in each test. */
let slots: PageAdSlot[] = [];
vi.mock('../hooks/useChapter', () => ({
  useChapter: () => ({ chapter, isLoaded: true, loadFailed: false }),
}));
vi.mock('@/features/ads/hooks/usePageAds', () => ({
  usePageAds: () => ({ isPending: false, data: slots }),
}));
vi.mock('../hooks/useRecordRead', () => ({ useRecordRead: () => undefined }));
// The Like button and the comments read the database; this test is about the banner slot only.
vi.mock('./LikeButton', () => ({ LikeButton: () => null }));
vi.mock('./ChapterComments', () => ({ ChapterComments: () => null }));

/** Draws the reader at a chapter's address, in English. */
function renderReader() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/s/statia-meteo/abcdefgh']}>
      <Routes>
        <Route path="/s/:storySlug/:chapterCode" element={<ChapterReaderPage />} />
      </Routes>
    </MemoryRouter>,
    'en',
  );
}

describe('the chapter reader’s ad slot', () => {
  beforeEach(() => {
    slots = [];
  });

  it('shows nothing at all where the page has no ad (a class-only story)', () => {
    const { container } = renderReader();
    expect(screen.getByText('Primul paragraf.')).toBeInTheDocument();
    expect(container.querySelector('[data-ad]')).toBeNull();
  });

  it('puts a banner below the chapter, after its text, never inside it', () => {
    slots = [
      {
        slot_key: 'chapter_end',
        position: 1,
        format: 'wide',
        matched: { language: 'ro' },
        ad: {
          key: 'house:write',
          label: 'house',
          kind: 'write',
          page_slug: null,
          title_ro: null,
          title_en: null,
        },
      },
    ];
    const { container } = renderReader();
    const slot = container.querySelector('[data-ad="wide"]');
    const text = container.querySelector('.tmc-chapter-text');
    const article = container.querySelector('article');
    if (slot === null || text === null || article === null) throw new Error('missing part');
    // Outside the article (so outside the text), and after it in the page's order.
    expect(article.contains(slot)).toBe(false);
    expect(text.contains(slot)).toBe(false);
    expect(article.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('From us')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start writing' })).toHaveAttribute(
      'href',
      '/write/new',
    );
  });
});
