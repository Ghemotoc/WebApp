/**
 * useFeatureFlags: the public feature flags, read again every minute (story S1-E2-01; S1-E11-03:
 * a change on Staff › Settings applies within a minute).
 *
 * Who calls it: screens that change with a flag, for example the sign-up page (invite_only,
 * adults_only, social_login).
 * What it calls: api/featureFlags.ts. Staff change flags on Staff › Settings (S1-E11-03).
 * Safe default: until the flags arrive, or if they can't be read, isOn() answers with the March
 * value given by the caller, so the screen never shows a door the database would refuse.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchPublicFlags, type FeatureFlags } from '../api/featureFlags';

/** How long a read stays fresh: a change on Staff › Settings reaches the app within a minute. */
const settingFreshMilliseconds = 60 * 1000;

/**
 * Loads the flags.
 *
 * @returns isOn(flagKey, safeDefault) and whether the flags have loaded
 */
export function useFeatureFlags() {
  const flags = useQuery<FeatureFlags>({
    queryKey: ['feature-flags'],
    staleTime: settingFreshMilliseconds,
    refetchInterval: settingFreshMilliseconds,
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
