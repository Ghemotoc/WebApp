/**
 * ReadInSwitch: the "Read in" control shows only for a story in several languages, keeps the
 * chapter and remembers the choice (bundle TRANSLATE-1b; Robert, 16 Nov 2026, 12:23 UTC).
 */
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { StoryEdition } from '../api/editions';
import { readRememberedEdition } from '../lib/rememberedEdition';

import { ReadInSwitch } from './ReadInSwitch';

/** A Romanian classic and its English translation, the English one on screen. */
const editions: StoryEdition[] = [
  {
    languageCode: 'ro',
    slug: 'luceafarul',
    title: 'Luceafărul',
    isOriginal: true,
    translatorName: null,
    isCurrent: false,
    chapterCode: 'rochapte',
  },
  {
    languageCode: 'en',
    slug: 'the-evening-star',
    title: 'The Evening Star',
    isOriginal: false,
    translatorName: 'Ana Vlad',
    isCurrent: true,
    chapterCode: 'enchapte',
  },
];

/** Shows where a link led and the state it carried, so a test can read both. */
function WhereWeLanded() {
  const location = useLocation();
  return <output>{`${location.pathname} ${JSON.stringify(location.state)}`}</output>;
}

/** Draws the switch in English, with every other address showing where a link led. */
function renderSwitch(list: StoryEdition[], chapterNumber: number | null) {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/s/the-evening-star/enchapte']}>
      <Routes>
        <Route
          path="/s/the-evening-star/enchapte"
          element={<ReadInSwitch editions={list} chapterNumber={chapterNumber} />}
        />
        <Route path="*" element={<WhereWeLanded />} />
      </Routes>
    </MemoryRouter>,
    'en',
  );
}

describe('ReadInSwitch', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('draws nothing for a story in one language', () => {
    const { container } = renderSwitch([], null);
    expect(container).toBeEmptyDOMElement();
    const single = editions.slice(0, 1);
    expect(renderSwitch(single, null).container).toBeEmptyDOMElement();
  });

  it('names the language on screen and opens a list of links, one per language', () => {
    renderSwitch(editions, 3);
    const pill = screen.getByRole('button', { name: 'Read in: English' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    // Each link keeps the chapter: it leads to the same chapter in that language.
    expect(screen.getByRole('link', { name: /română/i })).toHaveAttribute(
      'href',
      '/s/luceafarul/rochapte',
    );
    const current = screen.getByRole('link', { name: /English/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(current).toHaveTextContent('Translated by Ana Vlad');
    expect(screen.getByRole('link', { name: /română/i })).toHaveTextContent('Română · Original');
  });

  it('in the reader, opens the same chapter and carries the paragraph on screen (BOOKS B07)', () => {
    // The chapter's third paragraph is the first one below the bars.
    const text = document.createElement('div');
    text.className = 'tmc-chapter-text';
    [-200, 60, 400].forEach((bottom, index) => {
      const paragraph = document.createElement('p');
      paragraph.setAttribute('data-block', String(index + 1));
      paragraph.getBoundingClientRect = () => ({ bottom }) as DOMRect;
      text.append(paragraph);
    });
    document.body.append(text);
    renderSwitch(editions, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Read in: English' }));
    fireEvent.click(screen.getByRole('link', { name: /română/i }));
    expect(screen.getByRole('status')).toHaveTextContent(
      '/s/luceafarul/rochapte {"languageSwitch":{"block":3}}',
    );
    text.remove();
  });

  it('leads to the story page, carrying no paragraph, outside the reader', () => {
    const onStoryPage = editions.map((edition) => ({ ...edition, chapterCode: null }));
    renderSwitch(onStoryPage, null);
    fireEvent.click(screen.getByRole('button', { name: 'Read in: English' }));
    expect(screen.getByRole('link', { name: /română/i })).toHaveAttribute('href', '/s/luceafarul');
    // The story page carries no paragraph: the link opens as it is.
    fireEvent.click(screen.getByRole('link', { name: /română/i }));
    expect(screen.getByRole('status')).toHaveTextContent('/s/luceafarul null');
  });

  it('closes on Escape and puts the focus back on the pill', () => {
    renderSwitch(editions, null);
    const pill = screen.getByRole('button', { name: 'Read in: English' });
    fireEvent.click(pill);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(pill).toHaveFocus();
  });

  it('remembers the language picked for this story', () => {
    renderSwitch(editions, null);
    fireEvent.click(screen.getByRole('button', { name: 'Read in: English' }));
    fireEvent.click(screen.getByRole('link', { name: /română/i }));
    expect(readRememberedEdition('luceafarul')).toBe('ro');
  });

  it('on the story page shows "Read in" beside a field with the language (board B09)', () => {
    renderWithProviders(
      <MemoryRouter>
        <ReadInSwitch editions={editions} chapterNumber={null} look="field" />
      </MemoryRouter>,
      'en',
    );
    const field = screen.getByRole('button', { name: 'Read in: English' });
    expect(field).toHaveTextContent(/^English$/);
    expect(screen.getByText('Read in')).toBeInTheDocument();
    fireEvent.click(field);
    expect(screen.getByRole('navigation', { name: 'Read in' })).toBeVisible();
  });
});
