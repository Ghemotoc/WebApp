/**
 * useBrandAssets: the logo and emblem the app shows right now, for each theme (bundle BRAND-1,
 * part b).
 *
 * An approved upload wins; otherwise the bundled default (lib/brandDefaults.ts): the curled cat
 * logo (LOGO-1) for the emblem, and no logo picture, so the name shows as text. While the read is loading, fails,
 * or the app has no database (unit tests), the defaults show, so the top bar is never empty.
 * Who calls it: BrandMark (the top bar) and BrandTabIcon (the browser tab).
 * What it calls: fetchPublishedBrand() in api/publishedBrand.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import type { BrandSlot } from '../api/brandAssets';
import { brandAddressSeconds, fetchPublishedBrand } from '../api/publishedBrand';
import { defaultBrandPicture } from '../lib/brandDefaults';

/** What each slot shows: a picture address, or null for "the name as text" (a logo slot only). */
export type BrandPictures = Record<BrandSlot, string | null>;

/** Read again ten minutes before the signed addresses run out. */
const refreshMilliseconds = (brandAddressSeconds - 10 * 60) * 1000;

/**
 * Lays the approved uploads over the defaults.
 *
 * @param uploaded - the approved pictures by slot (empty while loading or after a failed read)
 * @returns what every slot shows
 */
export function brandPicturesFrom(uploaded: Partial<Record<BrandSlot, string>>): BrandPictures {
  return {
    logo_light: uploaded.logo_light ?? defaultBrandPicture.logo_light,
    logo_dark: uploaded.logo_dark ?? defaultBrandPicture.logo_dark,
    emblem_light: uploaded.emblem_light ?? defaultBrandPicture.emblem_light,
    emblem_dark: uploaded.emblem_dark ?? defaultBrandPicture.emblem_dark,
  };
}

/**
 * Follows the approved brand pictures.
 *
 * @returns what every slot shows; the defaults until (and unless) the read succeeds
 */
export function useBrandAssets(): BrandPictures {
  const query = useQuery({
    // The staff page refreshes this key after every change (useBrandSlots).
    queryKey: ['brand-assets'],
    staleTime: refreshMilliseconds,
    refetchInterval: refreshMilliseconds,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      // No database (a unit test or a build without settings): the defaults.
      if (client === null) return {};
      return fetchPublishedBrand(client);
    },
  });
  return brandPicturesFrom(query.data ?? {});
}
