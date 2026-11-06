/**
 * Sends a batch of calls to the call log (bundle LOGS-1, part c; Robert, 6 Nov 2026).
 *
 * Who calls it: lib/callRecorder.ts, every 15 seconds or 25 calls, and when the tab is hidden.
 * What it calls next: log_calls() in the database, which anyone may call, signed out included. It
 * checks every entry again, takes the user ID from the sign-in (never from the batch), applies a
 * per-minute limit and stores the rows in public.call_log
 * (supabase/migrations/20270204100001_logs1_02_call_log.sql).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { CallKind } from '../lib/describeCall';

/** One call as the browser saw it; the names match what log_calls() reads. */
export interface CallEntry {
  kind: CallKind;
  name: string;
  method: string;
  /** The HTTP status, 0 when there was no answer. */
  status: number;
  /** The error's code when the call failed ("42501", "PGRST116", "invalid_credentials"). */
  error_code: string | null;
  duration_ms: number;
  /** The page's route pattern, for example "/s/:storySlug". */
  route: string;
  version: string;
  /** When the call started, as an ISO time. */
  called_at: string;
}

/**
 * Stores a batch.
 *
 * @param client - the shared Supabase client
 * @param entries - at most 50 calls
 * @returns how many the database stored
 * Errors: throws with Supabase's message when the database can't be reached or refuses.
 */
export async function sendCalls(client: AppSupabaseClient, entries: CallEntry[]): Promise<number> {
  const { data, error } = await client.rpc('log_calls', { entries: entries as unknown as Json });
  if (error !== null) throw new Error(`Could not send the call log: ${error.message}`);
  return data;
}
