/**
 * "This week" on the Writers' hub: the one way the hub reads the writer's last 7 days (bundle
 * GAPS-12b; board WritersHub, "Your week").
 *
 * Who calls it: hooks/useHubWeek.ts. What it calls next: the database function
 * my_week_numbers() (migration gaps12b_my_week_numbers), which counts only the signed-in
 * writer's own chapters, reads, comments and new followers. A number that comes from fewer than
 * 5 people arrives as null (S1-E3-07 criterion 2), so nobody can be picked out.
 */
import { z } from 'zod';

import type { AppSupabaseClient } from '@/lib/supabase';

/** A count, or null when it comes from fewer than 5 people. */
const shownCount = z.number().int().nullable();

/** What my_week_numbers() answers. */
const weekSchema = z.object({
  chapters_posted: z.number().int(),
  reads: shownCount,
  comments: shownCount,
  followers: shownCount,
});

/** The writer's last 7 days as the hub shows them. */
export interface HubWeek {
  /** Chapters the writer published for the first time: exact, because it is their own doing. */
  chaptersPosted: number;
  /** Chapter openings; null when fewer than 5. */
  reads: number | null;
  /** Readers' comments on the writer's chapters; null when fewer than 5. */
  comments: number | null;
  /** People who started following the writer; null when fewer than 5. */
  followers: number | null;
}

/**
 * Reads the signed-in writer's last 7 days.
 *
 * @param client - the shared Supabase client
 * @returns the four numbers
 * @throws when the database refuses (nobody signed in) or answers something unexpected
 */
export async function fetchHubWeek(client: AppSupabaseClient): Promise<HubWeek> {
  // Step 1: ask the database; it works out who is asking from the session.
  const { data, error } = await client.rpc('my_week_numbers');
  if (error !== null) throw new Error(`Could not read this week's numbers: ${error.message}`);
  // Step 2: check the shape, so a change in the function fails here and not in the card.
  const week = weekSchema.parse(data);
  return {
    chaptersPosted: week.chapters_posted,
    reads: week.reads,
    comments: week.comments,
    followers: week.followers,
  };
}
