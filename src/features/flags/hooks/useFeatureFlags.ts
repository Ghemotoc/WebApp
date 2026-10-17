/**
 * useFeatureFlags: the public feature flags, cached for the whole visit (story S1-E2-01).
 *
 * Who calls it: screens that change with a flag, for example the sign-up page (invite_only,
 * adults_only, social_login).
 * What it calls: api/featureFlags.ts. Flags change by migration until S1-E11-03, so one read per
 * visit is enough.
 * Safe default: until the flags arrive, or if they can't be read, isOn() answers with the March
 * value given by the caller, so the screen never shows a door the database would refuse.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchPublicFlags, type FeatureFlags } from '../api/featureFlags';

/**
 * Loads the flags.
 *
 * @returns isOn(flagKey, safeDefault) and whether the flags have loaded
 */
export function useFeatureFlags() {
  const flags = useQuery<FeatureFlags>({
    queryKey: ['feature-flags'],
    staleTime: Infinity,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchPublicFlags(client);
    },
  });

  return {
    /**
     * Says whether a flag is on.
     *
     * @param flagKey - for example 'invite_only'
     * @param safeDefault - the answer while loading or when the flags can't be read
     * @returns true when the flag is on
     */
    isOn: (flagKey: string, safeDefault: boolean) => flags.data?.[flagKey] ?? safeDefault,
    isLoaded: flags.isSuccess,
  };
}
