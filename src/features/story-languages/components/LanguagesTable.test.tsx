/**
 * LanguagesTable and SideBySidePapers: what the writer sees of a story's languages and of a
 * chapter side by side (bundle TRANSLATE-1c; Robert, 16 Nov 2026; CALM-9 boards D08 and D09).
 */
import { fireEvent, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { StoryLanguage } from '../api/storyLanguages';

import { LanguagesTable } from './LanguagesTable';
import { SideBySidePapers } from './SideBySidePapers';

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
    // CALM-9, D08: a phone is told where translating works (the link is hidden there by CSS).
    expect(within(english).getByText('Translate on a tablet or computer')).toBeInTheDocument();
  });
});

describe('SideBySidePapers', () => {
  it('puts the translation beside the original, counts words and scrolls together by default', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SideBySidePapers
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
        onChange={onChange}
      />,
      'en',
    );
    // "Bunica notează vremea." + "Azi a nins." is 6 words; the one translated paragraph has 4.
    expect(screen.getByText('4 of 6 words so far')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Original Română' })).toHaveTextContent('6 words');
    expect(screen.getByRole('region', { name: 'Translation English' })).toHaveTextContent(
      '4 words',
    );
    expect(screen.getByRole('checkbox', { name: 'Scroll both sides together' })).toBeChecked();
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
