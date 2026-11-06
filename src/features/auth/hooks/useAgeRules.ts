/**
 * useAgeRules: the age rules by country, read once per visit (bundle MARKETS-1).
 *
 * Who calls it: the sign-up page, the country setting and the privacy notice's ages table.
 * What it calls: api/ageRules.ts. The rules change rarely (staff edit them in Settings › Age
 * rules), so they are read once and kept; a staff save refreshes them (queryKey ['age-rules']).
 */
import { useQuery } from '@tanstack/react-query';

import type { AgeRule } from '@/lib/age-rules';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchAgeRules } from '../api/ageRules';

/** The key every reader of the rules shares, so one save refreshes them all. */
export const ageRulesQueryKey = ['age-rules'] as const;

/**
 * Reads the rules.
 *
 * @returns the query: data is the rules once loaded
 */
export function useAgeRules() {
  return useQuery<AgeRule[]>({
    queryKey: ageRulesQueryKey,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const client = await getSupabaseClient();
      return client === null ? [] : fetchAgeRules(client);
    },
  });
}
