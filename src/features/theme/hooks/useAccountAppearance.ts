/**
 * useAccountAppearance: keeps the page in the member's colours (bundle G2 THEMES).
 *
 * Two jobs, run once for the whole app:
 * 1. Show the choices: night or light (following the device live with "Match my device") on
 *    <html data-theme>, and the look on <html data-look>: the season's look when Seasonal themes
 *    is on and a season is running (public setting seasonal_look_dates), otherwise the member's
 *    year-round theme.
 * 2. Follow the account: when a member signs in (or the page opens with a stored session), read
 *    their saved choices and show them, so the look follows them to every device. A choice made on
 *    this page while the read was on its way wins (the same guard as the account language).
 * Who calls it: AppLayout and StaffLayout (the staff area ignores looks in tokens.css, but its
 * night mode follows the same choice).
 * What it calls: lib/appearanceStore.ts, api/appearance.ts, src/lib/theme.ts and src/lib/looks.ts.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import {
  applyLook,
  decidedSeasonalWindows,
  parseSeasonalWindows,
  shownLookFor,
  type SeasonalWindow,
} from '@/lib/looks';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';
import { applyTheme, DEVICE_DARK_QUERY, resolveTheme } from '@/lib/theme';

import { readAccountAppearance } from '../api/appearance';
import {
  appearanceChoiceCount,
  getAppearance,
  mayApplyAccountAppearance,
  replaceAppearance,
  subscribeToAppearance,
} from '../lib/appearanceStore';

/** The Auth events after which the account's choices should be shown. */
const eventsThatBringAnAccount = new Set(['INITIAL_SESSION', 'SIGNED_IN']);

/**
 * Notes a failed read in the console, with Supabase's message only (CLAUDE.md rule 12). The page
 * keeps the device's choices, so nothing else is needed.
 *
 * @param error - what went wrong
 */
function logReadFailure(error: unknown): void {
  console.warn(error instanceof Error ? error.message : 'Could not read the account look.');
}

/**
 * Job 1: shows the current choices, and follows the device's dark mode live when the mode is
 * "Match my device".
 *
 * @param windows - the seasonal look windows
 */
function useShowAppearance(windows: readonly SeasonalWindow[]): void {
  const appearance = useSyncExternalStore(subscribeToAppearance, getAppearance);

  useEffect(() => {
    // Step 1: the look (it only changes the light colours; night is Revolver with every look).
    applyLook(shownLookFor(appearance.look, appearance.isSeasonalOn, new Date(), windows));
    // Step 2: night or light, now and whenever the device switches (for "Match my device").
    const deviceDarkQuery = window.matchMedia(DEVICE_DARK_QUERY);
    const showMode = () => applyTheme(resolveTheme(appearance.mode, deviceDarkQuery.matches));
    showMode();
    if (appearance.mode !== 'device') return undefined;
    deviceDarkQuery.addEventListener('change', showMode);
    return () => deviceDarkQuery.removeEventListener('change', showMode);
  }, [appearance, windows]);
}

/**
 * Reads the account's choices and shows them, unless the member made a choice meanwhile.
 *
 * @param client - the shared Supabase client
 * @param isStillWanted - false once the app has closed
 */
async function showAccountAppearance(client: AppSupabaseClient, isStillWanted: () => boolean) {
  const choicesBeforeRead = appearanceChoiceCount();
  const saved = await readAccountAppearance(client);
  if (!isStillWanted() || saved === null) return;
  if (!mayApplyAccountAppearance(choicesBeforeRead)) return;
  replaceAppearance(saved);
}

/**
 * Job 2: follows the signed-in account, once per person (Supabase repeats the sign-in event for
 * the same person, for example when the window gets focus again; repeats are ignored).
 */
function useFollowAccountAppearance(): void {
  useEffect(() => {
    let isMounted = true;
    let stopListening: () => void = () => undefined;
    let appliedUserId: string | null = null;

    /** Starts listening for the stored session and for sign-ins. */
    async function listenForAccounts() {
      // Step 1: without Supabase settings there are no accounts; the device's choices stay.
      const client = await getSupabaseClient();
      if (client === null || !isMounted) return;
      // Step 2: once per person, read their choices a tick later (Supabase's advice: don't call
      // it inside this callback directly).
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const userId = session?.user.id ?? null;
        if (event === 'SIGNED_OUT') appliedUserId = null;
        if (!eventsThatBringAnAccount.has(event) || userId === null || userId === appliedUserId) {
          return;
        }
        appliedUserId = userId;
        window.setTimeout(() => {
          void showAccountAppearance(client, () => isMounted).catch(logReadFailure);
        }, 0);
      });
      stopListening = () => data.subscription.unsubscribe();
    }

    void listenForAccounts().catch(logReadFailure);
    return () => {
      isMounted = false;
      stopListening();
    };
  }, []);
}

/**
 * Keeps the page in the member's colours and in step with their account.
 */
export function useAccountAppearance(): void {
  const settings = usePublicSettings();
  // The setting as text, so the windows are worked out again only when the setting changes.
  const windowsText = JSON.stringify(settings.valueOf('seasonal_look_dates') ?? null);
  const windows = useMemo(
    () => parseSeasonalWindows(JSON.parse(windowsText)) ?? decidedSeasonalWindows,
    [windowsText],
  );
  useShowAppearance(windows);
  useFollowAccountAppearance();
}
