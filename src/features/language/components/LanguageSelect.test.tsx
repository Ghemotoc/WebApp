/**
 * Tests for the language drop-downs and saving the choice (story S1-E1-04), drawn through the real
 * app shell, where the footer holds the one drop-down (bundle FIX-3).
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
  // Replaced by the stand-in client with a way to send it another Auth event.
  sendAuthEvent: (() => undefined) as (event: string) => void,
}));

/** The part of a Supabase session the language feature reads. */
interface StandInSession {
  user: { id: string };
}

/** A signed-in persona's session, as the stand-in reports it. */
const standInSession: StandInSession = { user: { id: 'persona' } };

/** A stand-in client with only the calls the language feature makes. */
function makeStandInClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: supabaseStandIn.isSignedIn ? standInSession : null },
      }),
      onAuthStateChange: (callback: (event: string, session: StandInSession | null) => void) => {
        // Supabase reports the stored session straight after a listener is added; the test can
        // also send later events (such as a repeated SIGNED_IN) through sendAuthEvent.
        const session = supabaseStandIn.isSignedIn ? standInSession : null;
        window.setTimeout(() => callback('INITIAL_SESSION', session), 0);
        supabaseStandIn.sendAuthEvent = (event: string) => callback(event, session);
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

/**
 * The footer's drop-down ("Limbă" while the screen is in Romanian). The top bar has none since
 * bundle FIX-3 (Robert, 9 Nov 2026, 12:20 UTC: the footer and Settings only).
 */
function languageDropDowns(name: string | RegExp) {
  return {
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
    sendAuthEvent: () => undefined,
  });
});

describe('the language drop-downs', () => {
  it('is a drop-down in the footer only, naming each language in its own language', () => {
    renderApp();
    const { footer } = languageDropDowns('Limbă');

    // The top bar has no language menu (bundle FIX-3); the footer names each language.
    expect(
      within(screen.getByRole('banner')).queryByRole('combobox', { name: 'Limbă' }),
    ).not.toBeInTheDocument();
    expect(footer.tagName).toBe('SELECT');
    expect(
      within(footer)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['English', 'Română']);
    expect(footer).toHaveValue('ro');
    // Each option keeps its language, so a screen reader pronounces it right (WCAG 3.1.2).
    expect(within(footer).getByRole('option', { name: 'Română' })).toHaveAttribute('lang', 'ro');
  });

  it('switch the whole screen to English from the footer and remember it in this browser', async () => {
    renderApp();

    fireEvent.change(languageDropDowns('Limbă').footer, { target: { value: 'en' } });

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

    fireEvent.change(languageDropDowns('Limbă').footer, { target: { value: 'en' } });

    await waitFor(() => expect(supabaseStandIn.savedLocales).toEqual(['en']));
    expect(await screen.findByText('Language saved to the account.')).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('keep the choice in this browser and say so when the account save fails', async () => {
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: true, saveFails: true });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderApp();

    fireEvent.change(languageDropDowns('Limbă').footer, { target: { value: 'en' } });

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

    fireEvent.change(languageDropDowns('Limbă').footer, { target: { value: 'en' } });

    await screen.findByRole('link', { name: 'Skip to content' });
    expect(supabaseStandIn.savedLocales).toEqual([]);
  });
});

describe('the account language', () => {
  it('is not applied again when Supabase repeats the sign-in for the same person', async () => {
    // The account says English; the person switches to Romanian on this device.
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: true, accountLocale: 'en' });
    renderApp();
    await screen.findByRole('link', { name: 'Skip to content' });
    fireEvent.change(languageDropDowns('Language').footer, { target: { value: 'ro' } });
    await screen.findByRole('link', { name: 'Sari la conținut' });

    // Supabase repeats SIGNED_IN (for example when the window gets focus again).
    supabaseStandIn.sendAuthEvent('SIGNED_IN');
    await new Promise((resolve) => window.setTimeout(resolve, 20));

    // The person's choice stays on screen.
    expect(screen.getByRole('link', { name: 'Sari la conținut' })).toBeInTheDocument();
  });

  it('is shown as soon as the app opens for someone signed in, on any device', async () => {
    Object.assign(supabaseStandIn, { isConfigured: true, isSignedIn: true, accountLocale: 'en' });
    renderApp();

    expect(await screen.findByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
