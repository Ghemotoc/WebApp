/**
 * Tests for the home page (story S1-E1-01).
 * Proves "an empty home route that shows the product name in both languages, from the brand
 * config, never typed in a component".
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProviders } from '@/app/AppProviders';
import { brand } from '@/config/brand';
import { createI18n, type SupportedLanguage } from '@/lib/i18n';

import { HomePage } from './HomePage';

/**
 * Draws the home page in one language with the same providers the real app uses.
 *
 * @param language - the interface language to render in
 */
function renderHomePage(language: SupportedLanguage) {
  render(
    <AppProviders i18n={createI18n(language)}>
      <HomePage />
    </AppProviders>,
  );
}

describe('HomePage', () => {
  it('shows the product name from the brand config in a Romanian heading by default', () => {
    renderHomePage('ro');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(`Bun venit la ${brand.productName}`);
  });

  it('shows the product name from the brand config in an English heading', () => {
    renderHomePage('en');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(`Welcome to ${brand.productName}`);
  });

  it('uses Romanian comma-below letters, not cedillas, in the Romanian text', () => {
    renderHomePage('ro');

    expect(screen.getByText(/povești/)).toBeInTheDocument();
  });
});
