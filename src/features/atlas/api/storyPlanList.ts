/**
 * Reads the list of the writer's story plans for /plan (bundle G10 ATLAS, part a; board AtlasHome:
 * "Your story plans").
 *
 * Who calls it: hooks/useMyStoryPlans.ts.
 * What it calls next: Supabase, my_story_plans() (supabase/migrations/…_g10a_atlas_glance.sql),
 * which answers one row per live story of the signed-in writer and never a user ID. The titles and
 * covers come from the writer's own story list (useMyStories), joined on the slug in the page.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { WritingStatus } from './storyPlans';

/** One story's plan, as a card on /plan shows it. */
export interface StoryPlanSummary {
  slug: string;
  logline: string;
  writingStatus: WritingStatus;
  wordTarget: number;
  wordsWritten: number;
}

/** One row as my_story_plans() answers it. */
interface StoryPlanSummaryRow {
  slug: string;
  logline: string;
  writing_status: WritingStatus;
  word_target: number;
  words_written: number;
}

/** The cache key of the writer's list of plans. */
export const myStoryPlansQueryKey = (userId: string | null) => ['my-story-plans', userId];

/**
 * Reads the writer's story plans, the one changed last first.
 *
 * @param client - the shared Supabase client
 * @returns one summary per live story; empty for a writer with no stories
 * Errors: throws when the database can't be reached or answers something that isn't a list.
 */
export async function fetchMyStoryPlans(client: AppSupabaseClient): Promise<StoryPlanSummary[]> {
  const { data, error } = await client.rpc('my_story_plans');
  if (error !== null) throw new Error(`Could not read the story plans: ${error.message}`);
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected answer from my_story_plans: ${JSON.stringify(data)}`);
  }
  // Step: rename each row's fields into the page's own names.
  return (data as unknown as StoryPlanSummaryRow[]).map((row) => ({
    slug: row.slug,
    logline: row.logline,
    writingStatus: row.writing_status,
    wordTarget: row.word_target,
    wordsWritten: row.words_written,
  }));
}
