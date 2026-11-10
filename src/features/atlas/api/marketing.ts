/**
 * Reads and changes a story's marketing notes (story S1-E17-29; bundle ATLAS, part g).
 *
 * The logline, genre, audience and publishing route are the plan's and the story's own, read and
 * saved through api/storyPlans.ts; this file holds the rest of the Marketing page.
 * Who calls it: hooks/useStoryMarketing.ts.
 * What it calls next: Supabase: story_marketing() and update_story_marketing()
 * (supabase/migrations/…_s1_e17_27_ideas_and_marketing.sql), and for the writer's own details
 * add_marketing_detail(), update_marketing_detail() and delete_marketing_detail() (bundle GAPS-2b,
 * …_gaps2b_marketing_details.sql). Only the writer reads them.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { checkedAnswer } from './checkedAnswer';

/** The marketing notes, keyed as the database names them. */
export interface MarketingNotes {
  back_cover_blurb: string;
  comparable_titles: string;
  hooks_keywords: string;
  query_pitch: string;
  launch_notes: string;
}

/** One of the writer's own marketing details ("Newsletter", "Reading dates"; GAPS-2b). */
export interface MarketingDetail {
  id: string;
  name: string;
  text: string;
}

/** Everything the Marketing page reads: the five notes and the writer's own details, in order. */
export interface StoryMarketing {
  notes: MarketingNotes;
  details: MarketingDetail[];
}

/** The cache key of a story's marketing notes. */
export const storyMarketingQueryKey = (userId: string | null, slug: string) => [
  'story-marketing',
  userId,
  slug,
];

/**
 * Reads a story's marketing notes.
 *
 * @returns the notes (empty before the first save) and the writer's own details, or null when the
 *   story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryMarketing(
  client: AppSupabaseClient,
  slug: string,
): Promise<StoryMarketing | null> {
  const answer = await client.rpc('story_marketing', { story_slug: slug });
  const data = checkedAnswer(answer, 'read the marketing notes', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  return {
    notes: data.notes as MarketingNotes,
    details: (data.own_details ?? []) as MarketingDetail[],
  };
}

/**
 * Saves one marketing field (S1-E17-29: each field saves by itself).
 *
 * Errors: throws when the text is too long or the database can't be reached.
 */
export async function saveMarketingField(
  client: AppSupabaseClient,
  slug: string,
  field: keyof MarketingNotes,
  value: string,
) {
  const answer = await client.rpc('update_story_marketing', {
    story_slug: slug,
    changes: { [field]: value },
  });
  checkedAnswer(answer, 'save the marketing notes');
}

/**
 * Adds one of the writer's own details, after the others, with no text yet (GAPS-2b).
 *
 * @param name - the detail's name, 1 to 80 characters
 * Errors: throws when the story already has 12 details, the name is empty or the database can't
 *   be reached.
 */
export async function addMarketingDetail(client: AppSupabaseClient, slug: string, name: string) {
  const answer = await client.rpc('add_marketing_detail', { story_slug: slug, detail_name: name });
  checkedAnswer(answer, 'add the marketing detail');
}

/**
 * Saves a detail's name or its text (each saves by itself).
 *
 * @param detailId - the detail
 * @param change - the new name (1 to 80 characters) or the new text (up to 5,000)
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveMarketingDetail(
  client: AppSupabaseClient,
  slug: string,
  detailId: string,
  change: { name: string } | { text: string },
) {
  const answer = await client.rpc('update_marketing_detail', {
    story_slug: slug,
    detail_id: detailId,
    changes: { ...change },
  });
  checkedAnswer(answer, 'save the marketing detail');
}

/**
 * Deletes a detail with its text (the screen asks first).
 *
 * Errors: throws when the detail isn't the story's or the database can't be reached.
 */
export async function deleteMarketingDetail(
  client: AppSupabaseClient,
  slug: string,
  detailId: string,
) {
  const answer = await client.rpc('delete_marketing_detail', {
    story_slug: slug,
    detail_id: detailId,
  });
  checkedAnswer(answer, 'delete the marketing detail');
}
