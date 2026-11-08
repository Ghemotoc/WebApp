/**
 * Reads and saves the member's appearance (mode, look and the seasonal switch) on their account
 * (bundle G2 THEMES: "saved on the profile and used on every device").
 *
 * Who calls it: hooks/useAccountAppearance.ts (read at sign-in) and hooks/useAppearance.ts (save).
 * What it calls next: Supabase. Reading goes to profiles through the profiles_select_own policy
 * (a member reads only their own row); saving goes through set_my_appearance(), which changes the
 * caller's own three columns and nothing else
 * (supabase/migrations/20270205100008_g2_appearance.sql).
 * Signed out: there is no account, so reading answers null and nothing is saved.
 */
import { isYearRoundLook } from '@/lib/looks';
import type { AppSupabaseClient } from '@/lib/supabase';
import { isThemePreference } from '@/lib/theme';

import type { Appearance } from '../lib/appearanceStore';

/**
 * Reads the appearance saved on the signed-in member's account.
 *
 * @param client - the shared Supabase client
 * @returns the saved choices; null when signed out, when the account has no profile yet, or when
 *   the member never saved a choice (appearance_saved_at is empty), so the device keeps its own
 * Errors: throws when the database can't be reached, with Supabase's message; the caller keeps
 *   the device's choices (the page still works).
 */
export async function readAccountAppearance(client: AppSupabaseClient): Promise<Appearance | null> {
  // Step 1: no session, no account to read from.
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (userId === undefined) return null;

  // Step 2: the member's own row (row-level security allows only that one).
  const { data, error } = await client
    .from('profiles')
    .select('look, colour_mode, seasonal_looks, appearance_saved_at')
    .eq('id', userId)
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read the account look: ${error.message}`);
  if (data === null) return null;
  // A member who never chose keeps each device's own choice, rather than the defaults everywhere.
  if (data.appearance_saved_at === null) return null;

  // Step 3: ignore anything unexpected (the table's checks prevent it).
  if (!isYearRoundLook(data.look) || !isThemePreference(data.colour_mode)) return null;
  return { mode: data.colour_mode, look: data.look, isSeasonalOn: data.seasonal_looks };
}

/**
 * Saves the choices on the signed-in member's account, so every device they sign in on shows them.
 *
 * @param client - the shared Supabase client
 * @param appearance - the three choices
 * Errors: throws when the database refuses or can't be reached; Settings › Appearance then says
 *   the choice is kept on this device only.
 */
export async function saveAccountAppearance(
  client: AppSupabaseClient,
  appearance: Appearance,
): Promise<void> {
  const { error } = await client.rpc('set_my_appearance', {
    new_look: appearance.look,
    new_colour_mode: appearance.mode,
    new_seasonal_looks: appearance.isSeasonalOn,
  });
  if (error !== null) throw new Error(`Could not save the account look: ${error.message}`);
}
