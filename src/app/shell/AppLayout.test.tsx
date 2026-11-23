/**
 * Tests for the app shell (story S1-E1-03): skip link, top bar, page, footer and the theme
 * drop-down, drawn through the real route list. Bundle G4 SHELL adds the narrow-screen headers
 * (A and B) and the floating tab bar.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/router';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';
import { replaceAppearance } from '@/features/theme/lib/appearanceStore';
import { createI18n } from '@/lib/i18n';
import { THEME_STORAGE_KEY } from '@/lib/theme';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));

/** Signs a member in for the test (the top bar shows Library, Together and search only to members). */
function signIn() {
  vi.mocked(useSession).mockReturnValue({ userId: 'member-1', isKnown: true });
}

beforeEach(() => {
  // A visitor by default: nobody is signed in.
  vi.mocked(useSession).mockReturnValue({ userId: null, isKnown: true });
});

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
  replaceAppearance({
    mode: 'device',
    look: 'lilac',
    isSeasonalOn: false,
    isLessMotionOn: false,
    isHighContrastOn: false,
  });
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

    expect(screen.getByRole('link', { name: `${brand.productName}, Home` })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('says "An app by" with the company name from the brand config in the footer', () => {
    renderApp();

    expect(screen.getByText(/An app by/)).toHaveTextContent(`An app by ${brand.companyName}`);
    // The company name opens the company's own site (Robert, 23 Nov 2026).
    expect(screen.getByRole('link', { name: brand.companyName })).toHaveAttribute(
      'href',
      brand.companySiteUrl,
    );
  });

  it("switches to night mode from the footer's Night mode button and remembers it on this device", () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Night mode' }));

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(screen.getByRole('button', { name: 'Night mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('follows the device by default (light in this test, whose device is not in dark mode)', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Night mode' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('shows the three footer columns from the design files (NIGHT-2)', () => {
    renderApp();

    const footer = screen.getByRole('contentinfo');
    for (const name of ['Read', 'Write and talk', 'Help and legal']) {
      expect(within(footer).getByRole('navigation', { name })).toBeInTheDocument();
    }
    expect(within(footer).getByRole('link', { name: 'Report without an account' })).toHaveAttribute(
      'href',
      '/report',
    );
    expect(within(footer).getByRole('link', { name: 'Join a class' })).toHaveAttribute(
      'href',
      '/class',
    );
  });
});

describe('the shell on a wide window (bundle G4 SHELL)', () => {
  it('has the website top bar with the search pill and no language menu', () => {
    signIn();
    renderApp('/discover');

    expect(screen.getByRole('search', { name: 'Search' })).toBeInTheDocument();
    // The language menu sits only in the footer and in Settings (bundle FIX-3).
    expect(
      within(screen.getByRole('banner')).queryByRole('combobox', { name: 'Language' }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('contentinfo')).getByRole('combobox', { name: 'Language' }),
    ).toBeInTheDocument();
    // No tab bar on a wide window: the only "Main" navigation is the top bar's.
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('lists Home, Read, Library and Together in the top bar, Home first (bundle CALM-2)', () => {
    signIn();
    renderApp('/discover');

    const topBar = screen.getByRole('navigation', { name: 'Main' });
    const names = within(topBar)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names).toEqual(['Home', 'Read', 'Library', 'Together']);
    // A member's Home is their own home page (CALM-1).
    expect(within(topBar).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/hub');
    expect(within(topBar).getByRole('link', { name: 'Read' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows a visitor only Home and Read, and no search (TRIAL-WALL, Robert 23 Nov 2026)', () => {
    renderApp('/discover');

    const topBar = screen.getByRole('navigation', { name: 'Main' });
    const names = within(topBar)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names).toEqual(['Home', 'Read']);
    expect(within(topBar).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('search', { name: 'Search' })).not.toBeInTheDocument();
  });
});

describe('the shell on a narrow window (bundle G4 SHELL)', () => {
  it('gives a browsing page header B and the floating tab bar, with the current tab marked', () => {
    signIn();
    useNarrowWindow();
    renderApp('/discover');

    expect(screen.getByRole('link', { name: `${brand.productName}, Home` })).toHaveAttribute(
      'href',
      '/hub',
    );
    const tabBar = screen.getByRole('navigation', { name: 'Main' });
    const readTab = within(tabBar).getByRole('link', { name: 'Read' });
    expect(readTab).toHaveAttribute('aria-current', 'page');
    // The current tab shows the 2 px thread line under its label, and no other tab does (CALM-2).
    expect(readTab.querySelector('[data-current-line]')).not.toBeNull();
    expect(
      within(tabBar).getByRole('link', { name: 'Together' }).querySelector('[data-current-line]'),
    ).toBeNull();
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
