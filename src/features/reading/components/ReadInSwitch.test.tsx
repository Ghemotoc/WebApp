/**
 * ReadInSwitch: the "Read in" control shows only for a story in several languages, keeps the
 * chapter and remembers the choice (bundle TRANSLATE-1b; Robert, 16 Nov 2026, 12:23 UTC).
 */
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

/** Draws the switch in English. */
function renderSwitch(list: StoryEdition[], chapterNumber: number | null) {
  return renderWithProviders(
    <MemoryRouter>
      <ReadInSwitch editions={list} chapterNumber={chapterNumber} />
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
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('You stay on chapter 3.')).toBeInTheDocument();
  });

  it('leads to the story page, with no chapter line, outside the reader', () => {
    const onStoryPage = editions.map((edition) => ({ ...edition, chapterCode: null }));
    renderSwitch(onStoryPage, null);
    fireEvent.click(screen.getByRole('button', { name: 'Read in: English' }));
    expect(screen.getByRole('link', { name: /română/i })).toHaveAttribute('href', '/s/luceafarul');
    expect(screen.queryByText(/You stay on chapter/)).toBeNull();
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
});
