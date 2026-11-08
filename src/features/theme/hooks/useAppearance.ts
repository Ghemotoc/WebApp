/**
 * useAppearance: the member's appearance choices and a way to change them (bundle G2 THEMES).
 *
 * Changing a choice shows it at once (the account sync applies it), remembers it on this device
 * and, for a signed-in member, saves it on the account so every device they sign in on shows it.
 * Who calls it: Settings › Appearance (AppearanceSettingsSection) and the footer's mode drop-down
 * (ThemeSelect). What it calls: lib/appearanceStore.ts and api/appearance.ts.
 */
import { useCallback, useState, useSyncExternalStore } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import { saveAccountAppearance } from '../api/appearance';
import {
  getAppearance,
  replaceAppearance,
  startAppearanceChoice,
  subscribeToAppearance,
  type Appearance,
} from '../lib/appearanceStore';

/**
 * Where the last change stands: nothing yet, saving, saved on the account, kept on this device
 * because nobody is signed in, or kept on this device because the save failed.
 */
export type AppearanceSaveState = 'idle' | 'saving' | 'saved' | 'signed-out' | 'failed';

/**
 * Saves the choices on the account when someone is signed in.
 *
 * @param next - the choices to save
 * @returns 'saved'; 'signed-out' when nobody is signed in (or there are no Supabase settings);
 *   'failed' when the database refused or couldn't be reached
 */
async function saveOnAccount(next: Appearance): Promise<AppearanceSaveState> {
  // Step 1: no Supabase settings or no session: the device keeps the choice.
  const client = await getSupabaseClient();
  if (client === null) return 'signed-out';
  const { data } = await client.auth.getSession();
  if (data.session === null) return 'signed-out';
  // Step 2: save on the account.
  try {
    await saveAccountAppearance(client, next);
    return 'saved';
  } catch (error) {
    // Supabase's message only, never personal data (CLAUDE.md rule 12); the choice still shows.
    console.warn(error instanceof Error ? error.message : 'Could not save the look.');
    return 'failed';
  }
}

/**
 * Reads the choices and lets the member change them.
 *
 * @returns the choices, change(partial) and where the last save stands
 */
export function useAppearance() {
  const appearance = useSyncExternalStore(subscribeToAppearance, getAppearance);
  const [saveState, setSaveState] = useState<AppearanceSaveState>('idle');

  /** Shows a change now, then saves it on the account. */
  const change = useCallback(async (partial: Partial<Appearance>) => {
    const finish = startAppearanceChoice();
    const next = { ...getAppearance(), ...partial };
    // Step 1: show and remember it on this device straight away.
    replaceAppearance(next);
    // Step 2: save it on the account, and say where it stands.
    setSaveState('saving');
    const outcome = await saveOnAccount(next).catch((): AppearanceSaveState => 'failed');
    finish();
    setSaveState(outcome);
  }, []);

  return { appearance, change, saveState };
}
