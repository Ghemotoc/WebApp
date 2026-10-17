/**
 * Reads the public feature flags (story S1-E2-01; the flags are from S1-E1-02).
 *
 * Who calls it: hooks/useFeatureFlags.ts.
 * What it calls next: public.feature_flags through the policy feature_flags_select_public: anyone,
 * signed out included, reads the flags marked public (invite_only, adults_only, social_login,
 * maintenance_mode). The screen uses them to choose what to show; the database still enforces every
 * rule itself (for example the sign-up trigger refuses a sign-up without an invite).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Each public flag's name and whether it is on. */
export type FeatureFlags = Record<string, boolean>;

/**
 * Reads every public flag.
 *
 * @param client - the shared Supabase client
 * @returns the flags by name
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchPublicFlags(client: AppSupabaseClient): Promise<FeatureFlags> {
  const { data, error } = await client.from('feature_flags').select('key, is_enabled');
  if (error !== null) throw new Error(`Could not read the feature flags: ${error.message}`);
  return Object.fromEntries(data.map((flag) => [flag.key, flag.is_enabled]));
}
