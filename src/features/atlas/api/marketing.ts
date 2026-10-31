/**
 * Reads and changes a story's marketing notes (story S1-E17-29; bundle ATLAS, part g).
 *
 * The logline, genre, audience and publishing route are the plan's and the story's own, read and
 * saved through api/storyPlans.ts; this file holds the rest of the Marketing page.
 * Who calls it: hooks/useStoryMarketing.ts.
 * What it calls next: Supabase: story_marketing() and update_story_marketing()
 * (supabase/migrations/…_s1_e17_27_ideas_and_marketing.sql). Only the writer reads them.
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

/** The cache key of a story's marketing notes. */
export const storyMarketingQueryKey = (userId: string | null, slug: string) => [
  'story-marketing',
  userId,
  slug,
];

/**
 * Reads a story's marketing notes.
 *
 * @returns the notes (empty before the first save), or null when the story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryMarketing(
  client: AppSupabaseClient,
  slug: string,
): Promise<MarketingNotes | null> {
  const answer = await client.rpc('story_marketing', { story_slug: slug });
  const data = checkedAnswer(answer, 'read the marketing notes', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  return data.notes as MarketingNotes;
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
