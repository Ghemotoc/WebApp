/**
 * useAccountLanguage: when someone is signed in, shows the interface in their account's language
 * (story S1-E1-04: "the choice is saved to their account and applies on every device").
 *
 * Who calls it: AppLayout (src/app/shell/AppLayout.tsx), once for the whole app.
 * What it calls: api/profileLocale.ts to read profiles.locale, then i18next to switch the screen
 * and src/lib/language-preference.ts so this browser remembers it for signed-out visits.
 * When it runs: when the page opens with a stored session, and again whenever someone signs in.
 * Without Supabase settings (getSupabaseClient() returns null) it does nothing.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { saveDeviceLanguage } from '@/lib/language-preference';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import { readAccountLanguage } from '../api/profileLocale';

/** The Auth events after which the account's language should be applied. */
const eventsThatBringAnAccount = new Set(['INITIAL_SESSION', 'SIGNED_IN']);

/**
 * Notes a failed read in the browser console, with Supabase's message only (never personal data,
 * CLAUDE.md rule 12). The screen stays in the language it already shows, so nothing else is needed.
 *
 * @param error - what went wrong
 */
function logReadFailure(error: unknown): void {
  console.warn(error instanceof Error ? error.message : 'Could not read the account language.');
}

/**
 * Keeps the interface in the signed-in account's language.
 * Errors: a failed read is logged (with Supabase's message only, never personal data, CLAUDE.md
 *   rule 12) and the screen stays in the language it already shows.
 */
export function useAccountLanguage(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    let stopListening: () => void = () => undefined;

    /** Reads the account's language and shows it, if it differs from what is on screen. */
    async function applyAccountLanguage(client: AppSupabaseClient) {
      const accountLanguage = await readAccountLanguage(client);
      if (!isMounted || accountLanguage === null) return;
      saveDeviceLanguage(accountLanguage);
      if (i18n.language !== accountLanguage) await i18n.changeLanguage(accountLanguage);
    }

    /** Starts listening for the stored session and for sign-ins. */
    async function listenForAccounts() {
      // Step 1: without Supabase settings there are no accounts; the device language stays.
      const client = await getSupabaseClient();
      if (client === null || !isMounted) return;

      // Step 2: Supabase reports the stored session first (INITIAL_SESSION), then each sign-in.
      // Its advice is not to call Supabase inside this callback directly, so the read waits a tick.
      const { data } = client.auth.onAuthStateChange((event) => {
        if (!eventsThatBringAnAccount.has(event)) return;
        window.setTimeout(() => void applyAccountLanguage(client).catch(logReadFailure), 0);
      });
      stopListening = () => data.subscription.unsubscribe();
    }

    void listenForAccounts().catch(logReadFailure);

    // Stop listening when the app is closed (or, in tests, unmounted).
    return () => {
      isMounted = false;
      stopListening();
    };
  }, [i18n]);
}
