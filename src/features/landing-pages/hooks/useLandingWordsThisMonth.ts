/**
 * useLandingWordsThisMonth: the words every writer wrote this month, for a landing page hero's
 * live count (BOOKS-A10, user story 1.10: "The live count updates every minute").
 *
 * Who calls it: LandingHero, only when the hero's live count is on.
 * What it calls: fetchLandingWordsThisMonth() in api/landingPages.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchLandingWordsThisMonth } from '../api/landingPages';

/** How often the count is read again: once a minute (story 1.10). */
const refreshMilliseconds = 60 * 1000;

/**
 * Reads the count, and reads it again every minute while the page is open.
 *
 * @param isOn - false skips the read (the hero has no live count, or it is the editor's preview)
 * @returns the query: data is the total, or null under five writers
 */
export function useLandingWordsThisMonth(isOn: boolean) {
  return useQuery({
    queryKey: ['landing-words-this-month'],
    enabled: isOn,
    staleTime: refreshMilliseconds,
    refetchInterval: refreshMilliseconds,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchLandingWordsThisMonth(client);
    },
  });
}
