/**
 * usePageAds: the ad slots of one page (bundle SPONSORS, part a1; story S1-E12-01; who sees ads
 * from bundle G7e).
 *
 * Ads show only to signed-in readers: a visitor who isn't signed in sees none, on any page
 * (Robert's design rules, 7 Nov 2026, "Content rules"; bundle G7e). So for a visitor the page
 * never asks the server at all, and the ad network's script never loads for them.
 * For a signed-in reader the server's answer still doesn't depend on who reads (S1-E12-01
 * criterion 2): only the page's own context is sent, so the cache is shared by everyone on the
 * same page and context, and kept for a few minutes.
 * Who calls it: PageAdSlot on every page with an ad. What it calls next: useSession() and
 * fetchPageAds() in api/ads.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';
import type { AdPageContext, AdPageKey, PageAdSlot } from '@/schemas/ads';

import { adContextFor, fetchPageAds } from '../api/ads';

/** Ads change at most once a day; five minutes keeps a page's two slots steady while reading. */
const adsFreshMilliseconds = 5 * 60 * 1000;

/** What the hook answers: whether the slots are still on their way, and the slots. */
export interface PageAdsState {
  /** True while it isn't known yet whether this page shows ads, or while they load. */
  isPending: boolean;
  /** The page's slots; empty where no ad may show (a visitor, a class space); undefined on error. */
  data: PageAdSlot[] | undefined;
}

/** A visitor's answer: settled at once, with no slot. */
const noAds: PageAdsState = { isPending: false, data: [] };

/**
 * Reads the page's slots once per page and context, for a signed-in reader only.
 *
 * @param pageKey - which page
 * @param context - the page's category, tag and language, and its space or story
 * @returns whether the slots are pending, and the slots (none for a visitor)
 */
export function usePageAds(pageKey: AdPageKey, context: AdPageContext = {}): PageAdsState {
  const session = useSession();
  // Step 1: ask the server only once we know a reader is signed in (G7e: no ads for visitors).
  const isSignedIn = session.isKnown && session.userId !== null;
  const sentContext = adContextFor(context);
  const query = useQuery({
    queryKey: ['page-ads', pageKey, sentContext],
    staleTime: adsFreshMilliseconds,
    retry: 1,
    enabled: isSignedIn,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchPageAds(client, pageKey, context);
    },
  });
  // Step 2: a visitor gets no slot, settled straight away, so nothing is held open for them.
  if (session.isKnown && !isSignedIn) return noAds;
  // Step 3: until the session is known, the slots count as on their way.
  if (!session.isKnown) return { isPending: true, data: undefined };
  return { isPending: query.isPending, data: query.data };
}
