/**
 * Following a forum thread (bundle GAPS-16, part a; story S1-E8-02; board 5.2, "Follow thread").
 *
 * A member who follows a thread gets one notification a day per thread while new replies come
 * in. Starting a thread follows it on its own (the database does that).
 * Who calls it: hooks/useThreadFollow.ts. What it calls next: follow_forum_thread() in
 * supabase/migrations/20270205100047_gaps16a_thread_follows.sql.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** What to change: the thread and whether to follow it. */
export interface FollowChange {
  threadNumber: number;
  wanted: boolean;
}

/**
 * Follows or unfollows a thread.
 *
 * @param client - the Supabase client
 * @param change - the thread's number and whether the member wants to follow it
 * @returns whether the member follows the thread now
 * @throws Error when the database refuses (signed out, or a thread the member can't open)
 */
export async function setThreadFollow(
  client: AppSupabaseClient,
  change: FollowChange,
): Promise<boolean> {
  // Step 1: ask the database; it checks the member may open the thread.
  const { data, error } = await client.rpc('follow_forum_thread', {
    thread_number: change.threadNumber,
    wanted: change.wanted,
  });
  // Step 2: a refusal is passed on, so the button can say it didn't work.
  if (error) throw new Error(`Following the thread failed: ${error.message}`);
  return data === true;
}
