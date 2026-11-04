/**
 * Unit tests for a house ad staff wrote (bundle SPONSORS-e1; story S1-E12-05 criterion 6: English
 * and Română copy and a link to one of our own pages).
 */
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { SlotAd } from '@/schemas/ads';
import { renderWithProviders } from '@/test/renderWithProviders';

import { HouseAdCreative } from './HouseAdCreative';

/** A house ad staff wrote, as page_ads() returns it. */
function staffAd(linkPath: string): SlotAd {
  return {
    key: 'house_ad:1',
    label: 'house',
    kind: 'staff',
    page_slug: null,
    title_ro: 'Săptămâna poeziei',
    title_en: 'Poetry week',
    text_ro: 'Citește și scrie',
    text_en: 'Read and write',
    link_path: linkPath,
  };
}

describe('HouseAdCreative for a house ad staff wrote', () => {
  it('shows its words in the reader’s language and leads to our own page', () => {
    renderWithProviders(
      <MemoryRouter>
        <HouseAdCreative ad={staffAd('/c/poetry-week')} isStacked={false} />
      </MemoryRouter>,
      'en',
    );
    expect(screen.getByText('Poetry week')).toBeInTheDocument();
    expect(screen.getByText('Read and write')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Take a look' })).toHaveAttribute(
      'href',
      '/c/poetry-week',
    );
  });

  it('shows the Romanian words to a Romanian reader', () => {
    renderWithProviders(
      <MemoryRouter>
        <HouseAdCreative ad={staffAd('/c/poetry-week')} isStacked={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Săptămâna poeziei')).toBeInTheDocument();
    expect(screen.getByText('Citește și scrie')).toBeInTheDocument();
  });

  it('shows nothing when the link isn’t a page on our own site', () => {
    const { container } = renderWithProviders(
      <MemoryRouter>
        <HouseAdCreative ad={staffAd('//example.com/')} isStacked={false} />
      </MemoryRouter>,
      'en',
    );
    expect(container).toBeEmptyDOMElement();
  });
});
