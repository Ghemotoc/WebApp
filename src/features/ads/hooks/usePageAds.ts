/**
 * usePageAds: the ad slots of one public page (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Who calls it: PageAdSlot on every public page. What it calls next: fetchPageAds() in
 * api/ads.ts. The answer doesn't depend on who reads (criterion 2), so the cache is shared by
 * everyone on the same page and context, and kept for a few minutes.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';
import type { AdPageContext, AdPageKey } from '@/schemas/ads';

import { adContextFor, fetchPageAds } from '../api/ads';

/** Ads change at most once a day; five minutes keeps a page's two slots steady while reading. */
const adsFreshMilliseconds = 5 * 60 * 1000;

/**
 * Reads the page's slots once per page and context.
 *
 * @param pageKey - which public page
 * @param context - the page's category, tag and language, and its space or story
 * @returns the query; data is the page's slots (empty where no ad may show)
 */
export function usePageAds(pageKey: AdPageKey, context: AdPageContext = {}) {
  const sentContext = adContextFor(context);
  return useQuery({
    queryKey: ['page-ads', pageKey, sentContext],
    staleTime: adsFreshMilliseconds,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchPageAds(client, pageKey, context);
    },
  });
}
