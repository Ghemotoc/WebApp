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

  it('shows the wordmark from the brand config as a link home in the top bar and the footer', () => {
    renderApp();

    // Two brand links since 24 Nov 2026: the top bar's and the one at the top of the footer.
    const brandLinks = screen.getAllByRole('link', { name: `${brand.productName}, Home` });
    expect(brandLinks).toHaveLength(2);
    for (const brandLink of brandLinks) expect(brandLink).toHaveAttribute('href', '/');
  });

  it('names no company in the footer: no "An app by" line and no company link', () => {
    renderApp();

    // Robert, 27 Nov 2026: every mention of the company was taken out of the site.
    expect(screen.queryByText(/An app by/)).toBeNull();
    expect(screen.queryByRole('link', { name: brand.companyName })).toBeNull();
  });

  it("switches to night mode from the footer's Night mode button and remembers it on this device", () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Night mode' }));

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    // At night the button names the other mode (Robert, 23 Nov 2026), and a press goes back.
    fireEvent.click(screen.getByRole('button', { name: 'Day mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Night mode' })).not.toHaveAttribute('aria-pressed');
  });

  it('follows the device by default (light in this test, whose device is not in dark mode)', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Night mode' })).toBeInTheDocument();
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
  it('has the website top bar with a search button and no language menu', () => {
    signIn();
    renderApp('/discover');

    // User story 1.7, boards A01 to A07: a round link to the Search page, after Write.
    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Search stories, writers and Together',
      }),
    ).toHaveAttribute('href', '/search');
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

  it('lists Hub, Read, Library and Together for a member, Hub first and opening the hub (Robert, 25 Nov 2026)', () => {
    signIn();
    renderApp('/discover');

    const topBar = screen.getByRole('navigation', { name: 'Main' });
    const names = within(topBar)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names).toEqual(['Hub', 'Read', 'Library', 'Together']);
    // Signed in, the first link is the Writers' hub; the logo still opens the member's Home at "/".
    expect(within(topBar).getByRole('link', { name: 'Hub' })).toHaveAttribute('href', '/hub');
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

    // The header's brand link and the footer's both open Home at "/" (user story 1.1).
    const brandLinks = screen.getAllByRole('link', { name: `${brand.productName}, Home` });
    expect(brandLinks.length).toBeGreaterThan(0);
    for (const brandLink of brandLinks) expect(brandLink).toHaveAttribute('href', '/');
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
