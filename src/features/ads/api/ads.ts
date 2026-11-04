/**
 * Reads the ad slots of one public page (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Who calls it: hooks/usePageAds.ts. What it calls next: page_ads() in
 * supabase/migrations/…_sponsors_a1_ad_slots.sql, which chooses every ad on the server from the
 * page's context alone (category, tag, language) and never from anything about the reader.
 * Part b3 adds fetchSponsorCredit(), which reads the "Sponsored by" line of a category or a
 * contest's page from sponsor_credit(). Part c adds recordSponsorEvent(), which counts a
 * sponsor's impression or click in record_sponsor_event() (totals per day, nothing about the
 * reader).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  pageAdsSchema,
  sponsorCreditSchema,
  type AdPageContext,
  type AdPageKey,
  type PageAdSlot,
  type SponsorCredit,
} from '@/schemas/ads';

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

/** What a "Sponsored by" line can belong to: a category's list or a contest's own page. */
export type SponsorCreditKind = 'category' | 'contest_page';

/**
 * The live sponsor of a category or a contest's page, for "Sponsored by" (S1-E12-02 criterion 3).
 *
 * @param client - the Supabase client (signed in or not: the answer is the same)
 * @param kind - 'category' (key: the category's slug) or 'contest_page' (key: the page's slug)
 * @param key - the slug
 * @returns the sponsor's name and link, or null when nobody sponsors it today
 * @throws Error when the database can't be reached or answers in an unexpected shape
 */
export async function fetchSponsorCredit(
  client: AppSupabaseClient,
  kind: SponsorCreditKind,
  key: string,
): Promise<SponsorCredit> {
  const { data, error } = await client.rpc('sponsor_credit', {
    credit_kind: kind,
    credit_key: key,
  });
  if (error !== null) throw new Error(`The sponsor could not be read: ${error.message}`);
  return sponsorCreditSchema.parse(data);
}

/** What can be counted for a sponsor: being shown, or its link being followed. */
export type SponsorEventKind = 'impression' | 'click';

/**
 * Counts one impression or click of a sponsor's ad or "Sponsored by" line (S1-E12-03 criterion 1).
 *
 * @param client - the Supabase client (signed in or not: nothing about the caller is kept)
 * @param adKey - the ad's key, 'campaign:<ID>'
 * @param kind - 'impression' or 'click'
 * @throws Error when the database can't be reached
 */
export async function recordSponsorEvent(
  client: AppSupabaseClient,
  adKey: string,
  kind: SponsorEventKind,
): Promise<void> {
  const { error } = await client.rpc('record_sponsor_event', { ad_key: adKey, event_kind: kind });
  if (error !== null) throw new Error(`The sponsor's ${kind} was not counted: ${error.message}`);
}
