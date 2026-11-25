/**
 * Reads "To follow this week", the first list in the Read page's Writers box (user story 1.4,
 * board A04).
 *
 * Who calls it: hooks/useWritersToFollow.ts.
 * What it calls next: writers_to_follow_now() in …_books_a04_writers_to_follow.sql. It returns the
 * writers staff picked in Stories › Featured or, when no pick may show to this reader, the writers
 * who gained the most followers this week. Both follow the rules of New and rising writers (only
 * writers who may be suggested, nobody across a block, never the reader, never a user ID).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { toRisingWriter, type RisingWriter, type RisingWriterRow } from './risingWriters';

/** The list, and where it came from. */
export interface WritersToFollow {
  /** picked: staff chose them; automatic: the week's biggest follower gains. */
  source: 'picked' | 'automatic';
  /** At most three writers; an empty list hides the list. */
  writers: RisingWriter[];
}

/** The answer as writers_to_follow_now() writes it. */
interface WritersToFollowRow {
  source: 'picked' | 'automatic';
  writers: RisingWriterRow[];
}

/**
 * Reads the list for whoever is reading.
 *
 * @param client - the shared Supabase client (signed out is fine)
 * @returns the source and the writers
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchWritersToFollow(client: AppSupabaseClient): Promise<WritersToFollow> {
  // Step 1: ask the database; it applies every rule for this reader.
  const { data, error } = await client.rpc('writers_to_follow_now');
  if (error !== null) throw new Error(error.message);
  // Step 2: turn each card into the screen's shape.
  const answer = data as unknown as WritersToFollowRow | null;
  return {
    source: answer?.source ?? 'automatic',
    writers: (answer?.writers ?? []).map(toRisingWriter),
  };
}
