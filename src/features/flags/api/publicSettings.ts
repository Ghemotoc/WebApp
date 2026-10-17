/**
 * Reads the public settings (story S1-E2-05; the settings table is from S1-E1-02).
 *
 * Who calls it: hooks/usePublicSettings.ts.
 * What it calls next: public.settings through the policy settings_select_public: anyone, signed
 * out included, reads the settings marked public (for example sign_in_pause_tries). The screen
 * uses them only for its words; the database applies every rule itself.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Each public setting's value by name. */
export type PublicSettings = Record<string, Json>;

/**
 * Reads every public setting.
 *
 * @param client - the shared Supabase client
 * @returns the values by name
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchPublicSettings(client: AppSupabaseClient): Promise<PublicSettings> {
  const { data, error } = await client.from('settings').select('key, value').eq('is_public', true);
  if (error !== null) throw new Error(`Could not read the settings: ${error.message}`);
  return Object.fromEntries(data.map((setting) => [setting.key, setting.value]));
}
