/**
 * useSponsorCredit: the "Sponsored by" line of a category's list or a contest's page (bundle
 * SPONSORS, part b3; story S1-E12-02 criterion 3).
 *
 * Who calls it: SponsoredByLine. What it calls next: fetchSponsorCredit() in api/ads.ts. The
 * answer is the same for everyone, so it is cached like the ads themselves.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchSponsorCredit, type SponsorCreditKind } from '../api/ads';

/** A sponsor changes at most once a day; five minutes, as for the ads. */
const creditFreshMilliseconds = 5 * 60 * 1000;

/**
 * Reads the credit once per kind and key.
 *
 * @param kind - 'category' or 'contest_page'
 * @param key - the category's or the page's slug; an empty key reads nothing
 * @returns the query; data is the sponsor, or null when there is none
 */
export function useSponsorCredit(kind: SponsorCreditKind, key: string) {
  return useQuery({
    queryKey: ['sponsor-credit', kind, key],
    enabled: key !== '',
    staleTime: creditFreshMilliseconds,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchSponsorCredit(client, kind, key);
    },
  });
}
