/**
 * usePublicLandingPage: the live landing page at /c/<slug> for a visitor (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * Who calls it: LandingPageScreen. What it calls: fetchPublicLandingPage() in api/landingPages.ts
 * with the visitor's client, signed in or not, and useSession() for whose Remind me it is.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
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
  // The Remind me state is the reader's own, so the cache is kept per signed-in person and the
  // read waits until Supabase knows who that is (part a2b).
  const session = useSession();
  return useQuery({
    queryKey: ['landing-page', slug, session.userId],
    enabled: session.isKnown,
    staleTime: pageFreshMilliseconds,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchPublicLandingPage(client, slug);
    },
  });
}
