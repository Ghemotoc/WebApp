/**
 * publishedBrand: the brand pictures every visitor sees, for the top bar and the browser tab icon
 * (bundle BRAND-1, part b).
 *
 * Who calls it: useBrandAssets() in the app shell.
 * What it calls next: brand_assets_published() (migration 20270128100002), which returns only
 * the slots whose picture passed its check and was approved, then Storage for a signed address
 * per picture (the `brand-assets` bucket is private; policy brand_assets_select_visible).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { BrandSlot } from './brandAssets';

/** A signed address lasts an hour; the hook reads them again before then. */
export const brandAddressSeconds = 60 * 60;

/**
 * Reads the approved brand pictures and signs an address for each.
 *
 * @param client - the shared Supabase client (signed in or not)
 * @returns the address of each slot that has an approved picture; the others are left out
 * @throws Error when the database can't be reached (the app then keeps its defaults)
 */
export async function fetchPublishedBrand(
  client: AppSupabaseClient,
): Promise<Partial<Record<BrandSlot, string>>> {
  // Step 1: which slots show an approved picture, and where each file is.
  const { data, error } = await client.rpc('brand_assets_published');
  if (error !== null) throw new Error(`Could not read the brand pictures: ${error.message}`);
  // Step 2: a signed address for each; a refused one is left out, so its default shows.
  const addresses: Partial<Record<BrandSlot, string>> = {};
  for (const row of data) {
    const signed = await client.storage
      .from(row.bucket)
      .createSignedUrl(row.path, brandAddressSeconds);
    if (signed.error === null) addresses[row.slot] = signed.data.signedUrl;
  }
  return addresses;
}
