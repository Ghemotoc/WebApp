/**
 * Tests for the app shell (story S1-E1-03): skip link, top bar, page, footer and the theme
 * drop-down, drawn through the real route list.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/router';
import { brand } from '@/config/brand';
import { replaceAppearance } from '@/features/theme/lib/appearanceStore';
import { createI18n } from '@/lib/i18n';
import { THEME_STORAGE_KEY } from '@/lib/theme';

/** Draws the app at "/" in English. */
function renderApp() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });
  render(
    <AppProviders i18n={createI18n('en')}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

afterEach(() => {
  // The appearance store lives for the whole page, so each test starts again from the defaults.
  replaceAppearance({ mode: 'device', look: 'lilac', isSeasonalOn: false });
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.look;
});

describe('the app shell', () => {
  it('starts with a "Skip to content" link that jumps to the main landmark', () => {
    renderApp();

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('shows the wordmark from the brand config as a link home', () => {
    renderApp();

    expect(screen.getByRole('link', { name: brand.productName })).toHaveAttribute('href', '/');
  });

  it('says "An app by" with the company name from the brand config in the footer', () => {
    renderApp();

    expect(screen.getByText(`An app by ${brand.companyName}`)).toBeInTheDocument();
  });

  it('switches to night mode from the footer drop-down and remembers it on this device', () => {
    renderApp();

    fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), {
      target: { value: 'night' },
    });

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
  });

  it('follows the device by default (light in this test, whose device is not in dark mode)', () => {
    renderApp();

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('device');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
