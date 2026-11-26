/**
 * How many people hear when a chapter goes out (board D06, "Tell followers"; user story 5.6).
 *
 * The Publish dialog says "1,284 followers get a notification when it goes out." next to the
 * switch. The number comes from the database, which counts the same people the notification
 * reaches (new_chapter_audience(): the writer's and the story's followers, by the story's
 * visibility and class), so the dialog never promises more than it sends.
 * Who calls it: useChapterPublishing. What it calls next: chapter_followers_to_tell().
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Reads how many followers a new chapter tells.
 *
 * @param client - the shared Supabase client
 * @param code - the chapter's code
 * @returns the number, or null when the chapter isn't the caller's own
 * Errors: throws when the database can't be reached.
 */
export async function fetchFollowersToTell(
  client: AppSupabaseClient,
  code: string,
): Promise<number | null> {
  const { data, error } = await client.rpc('chapter_followers_to_tell', { chapter_code: code });
  if (error !== null) throw new Error(`Could not count the followers: ${error.message}`);
  return data;
}
