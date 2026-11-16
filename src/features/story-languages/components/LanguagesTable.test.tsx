/**
 * LanguagesTable and ParagraphPairs: what the writer sees of a story's languages and of a chapter
 * side by side (bundle TRANSLATE-1c; Robert, 16 Nov 2026).
 */
import { fireEvent, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { StoryLanguage } from '../api/storyLanguages';

import { LanguagesTable } from './LanguagesTable';
import { ParagraphPairs } from './ParagraphPairs';

const languages: StoryLanguage[] = [
  {
    slug: 'statia-meteo',
    languageCode: 'ro',
    title: 'Stația meteo',
    blurb: '',
    isFirstEdition: true,
    chaptersInStory: 6,
    chaptersPublished: 6,
    isPublic: true,
  },
  {
    slug: 'the-weather-station',
    languageCode: 'en',
    title: 'The Weather Station',
    blurb: '',
    isFirstEdition: false,
    chaptersInStory: 6,
    chaptersPublished: 0,
    isPublic: false,
  },
];

describe('LanguagesTable', () => {
  it('lists the original first, marked Original, with a way to its chapters', () => {
    renderWithProviders(
      <MemoryRouter>
        <LanguagesTable languages={languages} />
      </MemoryRouter>,
      'en',
    );
    const [, original, english] = screen.getAllByRole('row');
    expect(original).toBeDefined();
    expect(english).toBeDefined();
    if (original === undefined || english === undefined) return;
    expect(within(original).getByText('Original')).toBeInTheDocument();
    expect(within(original).getByText('6 of 6')).toBeInTheDocument();
    expect(within(original).getByText('Published')).toBeInTheDocument();
    expect(
      within(original).getByRole('link', { name: 'Open the chapters of Stația meteo' }),
    ).toHaveAttribute('href', '/write/s/statia-meteo/chapters');
    // Only the writer translates their story (Robert, 16 Nov 2026, 12:20 UTC).
    expect(within(english).getByText('You')).toBeInTheDocument();
    expect(within(english).getByText('Draft')).toBeInTheDocument();
    expect(within(english).getByRole('link', { name: 'Translate into English' })).toHaveAttribute(
      'href',
      '/write/s/the-weather-station/translate',
    );
  });
});

describe('ParagraphPairs', () => {
  it('puts a field beside every paragraph of the original and counts the translated ones', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ParagraphPairs
        original={{
          languageCode: 'ro',
          languageName: 'Română',
          paragraphs: ['Bunica notează vremea.', 'Azi a nins.'],
        }}
        translation={{
          languageCode: 'en',
          languageName: 'English',
          fields: ['Grandmother notes the weather.', ''],
        }}
        translatedCount={1}
        onChange={onChange}
      />,
      'en',
    );
    expect(screen.getByText('English · 1 of 2 paragraphs')).toBeInTheDocument();
    expect(screen.getByText('Azi a nins.')).toHaveAttribute('lang', 'ro');
    expect(screen.getByRole('textbox', { name: 'Translate paragraph 1' })).toHaveValue(
      'Grandmother notes the weather.',
    );
    const second = screen.getByRole('textbox', { name: 'Translate paragraph 2' });
    expect(second).toHaveAttribute('lang', 'en');
    fireEvent.change(second, { target: { value: 'It snowed today.' } });
    expect(onChange).toHaveBeenCalledWith(1, 'It snowed today.');
  });
});
