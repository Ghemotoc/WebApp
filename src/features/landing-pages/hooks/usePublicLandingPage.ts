/**
 * usePublicLandingPage: the live landing page at /c/<slug> for a visitor (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * Who calls it: LandingPageScreen. What it calls: fetchPublicLandingPage() in api/landingPages.ts
 * with the visitor's client, signed in or not.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { fetchPublicLandingPage } from '../api/landingPages';

/** How long a read stays fresh: a publish shows within a minute, like the rest of the CMS. */
const pageFreshMilliseconds = 60 * 1000;

/**
 * Reads one page.
 *
 * @param slug - the address part after /c/
 * @returns the query: data is the page, or null when there is none to show
 */
export function usePublicLandingPage(slug: string) {
  return useQuery({
    queryKey: ['landing-page', slug],
    staleTime: pageFreshMilliseconds,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchPublicLandingPage(client, slug);
    },
  });
}
