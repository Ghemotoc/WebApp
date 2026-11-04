/**
 * Reads the ad slots of one public page (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Who calls it: hooks/usePageAds.ts. What it calls next: page_ads() in
 * supabase/migrations/…_sponsors_a1_ad_slots.sql, which chooses every ad on the server from the
 * page's context alone (category, tag, language) and never from anything about the reader.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import { pageAdsSchema, type AdPageContext, type AdPageKey, type PageAdSlot } from '@/schemas/ads';

/**
 * Turns the page's context into what page_ads() takes, leaving out empty values.
 *
 * @param context - what the page knows about itself
 * @returns the JSON object for the call
 */
export function adContextFor(context: AdPageContext): Record<string, string> {
  const pairs: [string, string | null | undefined][] = [
    ['category', context.category],
    ['tag', context.tag],
    ['language', context.language],
    ['space_slug', context.spaceSlug],
    ['story_slug', context.storySlug],
  ];
  const sent: Record<string, string> = {};
  // Only filled-in values travel; the server reads nothing else.
  for (const [name, value] of pairs) {
    if (typeof value === 'string' && value !== '') sent[name] = value;
  }
  return sent;
}

/**
 * The page's slots, each with the ad that fills it.
 *
 * @param client - the Supabase client (signed in or not: the answer is the same)
 * @param pageKey - which public page
 * @param context - the page's category, tag and language, and its space or story
 * @returns the slots in order; empty for a page without slots or in a class space
 * @throws Error when the database can't be reached or answers in an unexpected shape
 */
export async function fetchPageAds(
  client: AppSupabaseClient,
  pageKey: AdPageKey,
  context: AdPageContext,
): Promise<PageAdSlot[]> {
  const { data, error } = await client.rpc('page_ads', {
    page_key: pageKey,
    context: adContextFor(context),
  });
  if (error !== null) throw new Error(`The ads for this page could not be read: ${error.message}`);
  return pageAdsSchema.parse(data);
}
