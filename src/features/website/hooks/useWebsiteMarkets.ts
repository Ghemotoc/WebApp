/**
 * useWebsiteMarkets: the markets and their languages, for the website's addresses (bundle
 * LOCALISE-1): which "/<country>/<language>" places exist and where a visitor without one goes.
 *
 * Who calls it: LocalisedWebsiteLayout and WebsiteForward. What it calls: the public markets
 * table (anyone may read which countries there are and their languages; nothing in it is personal).
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';
import type { WebsiteMarket } from '@/lib/websitePlace';

/**
 * Follows the markets list.
 *
 * @returns markets (empty until read), isKnown (the read finished, well or not) and readFailed
 */
export function useWebsiteMarkets() {
  const markets = useQuery<WebsiteMarket[]>({
    queryKey: ['website-places'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      // Step 1: without database settings there is no list; the pages then use the fallback place.
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      // Step 2: each market with the languages it offers.
      const { data, error } = await client
        .from('markets')
        .select('country_code, languages, is_open');
      if (error !== null) throw new Error(`Could not read the markets: ${error.message}`);
      return data.map((market) => ({
        countryCode: market.country_code,
        languages: market.languages,
        isOpen: market.is_open,
      }));
    },
  });
  return {
    markets: markets.data ?? [],
    isKnown: !markets.isPending,
    readFailed: markets.isError,
  };
}
