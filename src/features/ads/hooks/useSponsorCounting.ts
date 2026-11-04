/**
 * Counting a sponsor's impressions and clicks (bundle SPONSORS, part c; story S1-E12-03
 * criterion 1).
 *
 * An impression is counted once each time a sponsor's ad or "Sponsored by" line appears on a page;
 * a click each time its link is followed. Only the campaign's key travels: no cookie, no user ID,
 * nothing about the reader. A failure only means one count is missing from a total, so it goes to
 * the console for developers and the reader is never interrupted.
 * Who calls it: AdBox (through SponsorAdCreative) and SponsoredByLine.
 * What it calls: api/ads.ts → record_sponsor_event().
 */
import { useEffect } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

import { recordSponsorEvent, type SponsorEventKind } from '../api/ads';

/**
 * Sends one count and reports a failure to the console.
 *
 * @param adKey - the campaign's key
 * @param kind - 'impression' or 'click'
 */
export function countSponsorEvent(adKey: string, kind: SponsorEventKind): void {
  void (async () => {
    try {
      const client = await getSupabaseClient();
      if (client !== null) await recordSponsorEvent(client, adKey, kind);
    } catch (error) {
      console.warn('A sponsor count was not sent.', error);
    }
  })();
}

/**
 * Counts one impression when a sponsor's ad or line appears, and again only if the ad changes.
 *
 * @param adKey - the campaign's key, or null while there is no sponsor to show
 */
export function useSponsorImpression(adKey: string | null | undefined): void {
  useEffect(() => {
    if (adKey === null || adKey === undefined) return;
    countSponsorEvent(adKey, 'impression');
  }, [adKey]);
}
