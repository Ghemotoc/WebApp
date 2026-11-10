/**
 * A forum thread's view total (bundle GAPS-16, part d; story S1-E8-02; board 5.2, "Views").
 *
 * Only a total is kept, never who opened the thread.
 * Who calls it: hooks/useRecordThreadView.ts. What it calls next: record_forum_thread_view() in
 * supabase/migrations/20270205100049_gaps16d_thread_views.sql.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Adds one to a thread's view total.
 *
 * @param client - the Supabase client (a visitor's works too)
 * @param threadNumber - the thread's number
 * @returns true when the view counted (the starter's own visits don't)
 * @throws Error when the request fails
 */
export async function recordThreadView(
  client: AppSupabaseClient,
  threadNumber: number,
): Promise<boolean> {
  const { data, error } = await client.rpc('record_forum_thread_view', {
    thread_number: threadNumber,
  });
  if (error) throw new Error(`Counting the thread view failed: ${error.message}`);
  return data === true;
}
