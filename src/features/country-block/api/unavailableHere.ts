/**
 * unavailableHere: asks whether a story would open but for the reader's country (bundle COUNTRY-1).
 *
 * Who calls it: hooks/useUnavailableHere.ts. What it calls next: story_unavailable_here() in
 * supabase/migrations/…_country1_hide_in_countries.sql, which reads the reader's country from the
 * X-Viewer-Country header the shared client adds (src/lib/viewerCountry.ts).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Asks the database.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns true only when the story is hidden where the reader is
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchUnavailableHere(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('story_unavailable_here', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not ask where the story shows: ${error.message}`);
  return data === true;
}
