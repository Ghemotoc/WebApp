/**
 * Tests for the app shell (story S1-E1-03): skip link, top bar, page, footer and the theme
 * drop-down, drawn through the real route list. Bundle G4 SHELL adds the narrow-screen headers
 * (A and B) and the floating tab bar.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/router';
import { brand } from '@/config/brand';
import { replaceAppearance } from '@/features/theme/lib/appearanceStore';
import { createI18n } from '@/lib/i18n';
import { THEME_STORAGE_KEY } from '@/lib/theme';

/** Draws the app at an address (home by default) in English. */
function renderApp(address = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [address] });
  render(
    <AppProviders i18n={createI18n('en')}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

/** The test setup's matchMedia stand-in, kept so each test can put it back. */
const wideMatchMedia = window.matchMedia;

/** Makes the window narrower than 1024 px: the narrow-screen query matches, the others don't. */
function useNarrowWindow() {
  window.matchMedia = (query: string) => ({
    ...wideMatchMedia(query),
    matches: query.includes('max-width: 1023.98px'),
  });
}

afterEach(() => {
  window.matchMedia = wideMatchMedia;
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

describe('the shell on a wide window (bundle G4 SHELL)', () => {
  it('has the website top bar with the search pill and the language as a code', () => {
    renderApp();

    expect(screen.getByRole('search', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'EN' })).toHaveLength(1);
    // No tab bar on a wide window: the only "Main" navigation is the top bar's.
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Search' })).not.toBeInTheDocument();
  });
});

describe('the shell on a narrow window (bundle G4 SHELL)', () => {
  it('gives a browsing page header B and the floating tab bar, with the page on the bubble', () => {
    useNarrowWindow();
    renderApp('/discover');

    expect(screen.getByRole('link', { name: `${brand.productName} home` })).toHaveAttribute(
      'href',
      '/',
    );
    const tabBar = screen.getByRole('navigation', { name: 'Main' });
    expect(within(tabBar).getByRole('link', { name: 'Discover' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabBar).getByRole('link', { name: 'Write' })).toHaveAttribute('href', '/write');
    expect(within(tabBar).getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search');
    // The website top bar and its search pill are not drawn as well.
    expect(screen.queryByRole('search', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('gives a place where a person types header A: Back and a title, and no tab bar', () => {
    useNarrowWindow();
    renderApp('/sign-in');

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByText('Log in', { selector: 'header p' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('sends Back to the parent page when the person arrived straight from a link', async () => {
    useNarrowWindow();
    const router = renderApp('/sign-in');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
