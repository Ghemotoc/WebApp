/**
 * Tests for the language drop-downs and saving the choice (story S1-E1-04), drawn through the real
 * app shell so both drop-downs (top bar and footer) are on the page together.
 *
 * Supabase is replaced by a small stand-in, so these tests cover the screen's side: what is shown,
 * what is saved where and what is said when saving fails. The database side (only your own row,
 * only ro or en) is proved by supabase/tests/database/014-profile-locale.test.sql, and the whole
 * journey across two browsers by e2e/language.spec.ts.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/router';
import { createI18n } from '@/lib/i18n';
import { LANGUAGE_STORAGE_KEY } from '@/lib/language-preference';

/** What the stand-in Supabase answers. Each test sets what it needs. */
const supabaseStandIn = vi.hoisted(() => ({
  isConfigured: false,
  isSignedIn: false,
  accountLocale: 'ro',
  saveFails: false,
  savedLocales: [] as string[],
}));

/** A stand-in client with only the calls the language feature makes. */
function makeStandInClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: supabaseStandIn.isSignedIn ? { user: { id: 'persona' } } : null },
      }),
      onAuthStateChange: (callback: (event: string) => void) => {
        // Supabase reports the stored session straight after a listener is added.
        window.setTimeout(() => callback('INITIAL_SESSION'), 0);
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    },
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: { locale: supabaseStandIn.accountLocale }, error: null }),
      }),
    }),
    rpc: async (_name: string, args: { new_locale: string }) => {
      if (supabaseStandIn.saveFails) return { error: { message: 'network down' } };
      supabaseStandIn.savedLocales.push(args.new_locale);
      return { error: null };
    },
  };
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: async () => (supabaseStandIn.isConfigured ? makeStandInClient() : null),
}));

/** Draws the app at "/" in Romanian, as a first visit does. */
function renderApp() {
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] });
  render(
    <AppProviders i18n={createI18n('ro')}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

/** The top bar's and the footer's drop-downs ("Limbă" while the screen is in Romanian). */
function languageDropDowns(name: string | RegExp) {
  return {
    topBar: within(screen.getByRole('banner')).getByRole('combobox', { name }),
    footer: within(screen.getByRole('contentinfo')).getByRole('combobox', { name }),
  };
}

afterEach(() => {
  window.localStorage.clear();
  Object.assign(supabaseStandIn, {
    isConfigured: false,
    isSignedIn: false,
    accountLocale: 'ro',
    saveFails: false,
    savedLocales: [],
  });
});

describe('the language drop-downs', () => {
  it('are drop-downs in both the top bar and the footer, listing English and Română', () => {
    renderApp();
    const { topBar, footer } = languageDropDowns('Limbă');

    for (const dropDown of [topBar, footer]) {
      expect(dropDown.tagName).toBe('SELECT');
      expect(
        within(dropDown)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['English', 'Română']);
      expect(dropDown).toHaveValue('ro');
    }
    expect(within(topBar).getByRole('option', { name: 'Română' })).toHaveAttribute('lang', 'ro');
  });

  it('switch the whole screen to English from the top bar and remember it in this browser', async () => {
    renderApp();

    fireEvent.change(languageDropDowns('Limbă').topBar, { target: { value: 'en' } });

    expect(await screen.findByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(languageDropDowns('Language').footer).toHaveValue('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('switch back to Romanian from the footer', async () => {
    renderApp();
    fireEvent.change(languageDropDowns('Limbă').footer, { target: { value: 'en' } });
    await screen.findByRole('link', { name: 'Skip to content' });

    fireEvent.change(languageDropDowns('Language').footer, { target: { value: 'ro' } });

    expect(await screen.findByRole('link', { name: 'Sari la conținut' })).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ro');
  });

  it('save the choice to the account when someone is signed in, and say so', async () => {
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: true });
    renderApp();

    fireEvent.change(languageDropDowns('Limbă').topBar, { target: { value: 'en' } });

    await waitFor(() => expect(supabaseStandIn.savedLocales).toEqual(['en']));
    expect(await screen.findByText('Language saved to your account.')).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('keep the choice in this browser and say so when the account save fails', async () => {
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: true, saveFails: true });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderApp();

    fireEvent.change(languageDropDowns('Limbă').topBar, { target: { value: 'en' } });

    expect(
      await screen.findByText(
        "We couldn't save the language to your account. It's kept on this device.",
      ),
    ).toBeVisible();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('save nothing to an account when nobody is signed in', async () => {
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: false });
    renderApp();

    fireEvent.change(languageDropDowns('Limbă').topBar, { target: { value: 'en' } });

    await screen.findByRole('link', { name: 'Skip to content' });
    expect(supabaseStandIn.savedLocales).toEqual([]);
  });
});

describe('the account language', () => {
  it('is shown as soon as the app opens for someone signed in, on any device', async () => {
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: true, accountLocale: 'en' });
    renderApp();

    expect(await screen.findByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
