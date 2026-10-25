/**
 * usePublicSettings: the public settings, cached for the whole visit (story S1-E2-05).
 *
 * Who calls it: screens whose words name a setting, for example the log-in pause ("paused for 15
 * minutes"). What it calls: api/publicSettings.ts. Settings change by migration until S1-E11-03,
 * so one read per visit is enough.
 * Safe default: until the settings arrive, or if they can't be read, numberOf() answers with the
 * decided value given by the caller.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchPublicSettings, type PublicSettings } from '../api/publicSettings';

/**
 * Loads the settings.
 *
 * @returns numberOf(settingKey, fallback) and wordsOf(settingKey, fallback)
 */
export function usePublicSettings() {
  const settings = useQuery<PublicSettings>({
    queryKey: ['public-settings'],
    staleTime: Infinity,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchPublicSettings(client);
    },
  });

  return {
    /**
     * A number setting.
     *
     * @param settingKey - for example 'sign_in_pause_minutes'
     * @param fallback - the decided value, used while loading or when it can't be read
     * @returns the number
     */
    numberOf: (settingKey: string, fallback: number) => {
      const value = settings.data?.[settingKey];
      return typeof value === 'number' ? value : fallback;
    },
    /**
     * A setting that is a list of words, for example Discover's shelf order (S1-E5-03).
     *
     * @param settingKey - for example 'discover_shelves'
     * @param fallback - the decided list, used while loading or when it can't be read
     * @returns the words, leaving out anything that isn't one
     */
    wordsOf: (settingKey: string, fallback: readonly string[]): readonly string[] => {
      const value = settings.data?.[settingKey];
      if (!Array.isArray(value)) return fallback;
      return value.filter((item): item is string => typeof item === 'string');
    },
  };
}
