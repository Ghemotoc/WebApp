/**
 * The investor numbers' one call from the member app (story S1-E15-04, bundle ANALYTICS-1a).
 *
 * Who calls it: components/ActiveMinutesCounter.tsx.
 * What it calls next: note_active_minute() (…_s1_e15_04_investor_numbers.sql), which counts the
 * member active today and adds a minute to the day's totals, at most one every 45 seconds, and
 * keeps only their last day, never a history.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Says "here" for this minute.
 *
 * @param client - the signed-in Supabase client
 * @param isReading - true while a chapter is open
 * @returns nothing
 * @throws Error when the database refuses or can't be reached
 */
export async function noteActiveMinute(client: AppSupabaseClient, isReading: boolean) {
  const { error } = await client.rpc('note_active_minute', { is_reading: isReading });
  if (error !== null) throw new Error(`The minute was not counted: ${error.message}`);
}
