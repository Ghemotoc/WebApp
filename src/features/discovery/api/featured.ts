/**
 * Reads Featured this week, the band at the top of Discover (story S1-E5-10, bundle LOOK-4a).
 *
 * Who calls it: hooks/useFeaturedStories.ts.
 * What it calls next: featured_stories_now() in …_look4a_02_featured_picks.sql, which gives the
 * staff's picks in order for this reader only: never a story above their rating, across a block,
 * hidden by moderators or by a writer who can no longer be featured (16 or over, active). The
 * cards have the same shape as every story list's, so toListedStory() reads them.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { toListedStory, type ListedStory, type ListedStoryRow } from './storyLists';

/**
 * Reads the band's stories.
 *
 * @param client - the shared Supabase client
 * @returns the stories in the staff's order; an empty list means the band is hidden
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchFeaturedStories(client: AppSupabaseClient): Promise<ListedStory[]> {
  // Step 1: ask the database; it applies every rule for this reader.
  const { data, error } = await client.rpc('featured_stories_now');
  if (error !== null) throw new Error(error.message);
  // Step 2: the answer is a JSON array of story cards.
  const rows = (data ?? []) as unknown as ListedStoryRow[];
  return rows.map(toListedStory);
}
