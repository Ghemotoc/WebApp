/**
 * useAccountLanguage: when someone is signed in, shows the interface in their account's language
 * (story S1-E1-04: "the choice is saved to their account and applies on every device").
 *
 * Who calls it: AppLayout (src/app/shell/AppLayout.tsx), once for the whole app.
 * What it calls: api/profileLocale.ts to read profiles.locale, then i18next to switch the screen
 * and src/lib/language-preference.ts so this browser remembers it for signed-out visits.
 * When it runs: once per signed-in person: when the page opens with a stored session, or when a
 * different person signs in. Supabase repeats the sign-in event for the same person (for example
 * when the window gets focus again); those repeats are ignored, so a language the person has just
 * picked is never switched back by a late read (found by the S1-E1-QA epic check).
 * Without Supabase settings (getSupabaseClient() returns null) it does nothing.
 */
import { useContext, useEffect } from 'react';
import { I18nContext } from 'react-i18next';

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
  // The one translation instance from AppProviders. Not useTranslation(): that hands back a new
  // object after every language change, which would restart this listener and re-apply the
  // account language over the person's fresh choice (found by the S1-E1-QA epic check).
  const { i18n } = useContext(I18nContext);

  useEffect(() => {
    let isMounted = true;
    let stopListening: () => void = () => undefined;
    // The person whose account language is already on screen; null when nobody is signed in.
    let appliedUserId: string | null = null;

    /**
     * Reads the account's language and shows it, if it differs from what is on screen. If the
     * person picks a language while the read is on its way, their choice wins.
     */
    async function applyAccountLanguage(client: AppSupabaseClient) {
      const languageBeforeRead = i18n.language;
      const accountLanguage = await readAccountLanguage(client);
      if (!isMounted || accountLanguage === null) return;
      if (i18n.language !== languageBeforeRead) return;
      saveDeviceLanguage(accountLanguage);
      if (i18n.language !== accountLanguage) await i18n.changeLanguage(accountLanguage);
    }

    /** Starts listening for the stored session and for sign-ins. */
    async function listenForAccounts() {
      // Step 1: without Supabase settings there are no accounts; the device language stays.
      const client = await getSupabaseClient();
      if (client === null || !isMounted) return;

      // Step 2: Supabase reports the stored session first (INITIAL_SESSION), then each sign-in.
      // Apply the account language once per person: a repeated event for the same person is ignored.
      // Supabase's advice is not to call it inside this callback directly, so the read waits a tick.
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const userId = session?.user.id ?? null;
        if (event === 'SIGNED_OUT') appliedUserId = null;
        if (!eventsThatBringAnAccount.has(event) || userId === null || userId === appliedUserId) {
          return;
        }
        appliedUserId = userId;
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
