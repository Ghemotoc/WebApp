/**
 * Writer ranks: reads a writer's rank for their profile (story S1-E8-09; board 6.1).
 *
 * The rank is worked out in the database from published chapters and their words, never from
 * forum posts, and nobody can set it by hand (criteria 1 and 2). This file only reads it.
 * Who calls it: hooks/useWriterRank.ts. What it calls next: profile_rank()
 * (supabase/migrations/…_forums2_e_ranks.sql). A post's rank comes with the post itself
 * (forum_post_json()'s author_rank, read in api/forumThreads.ts).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { rankFrom, type WriterRank } from '../lib/writerRanks';

/** A writer's rank with the numbers it comes from. */
export interface ProfileRank {
  rank: WriterRank;
  chapters: number;
  words: number;
}

/**
 * Reads profile_rank()'s JSON.
 *
 * @param data - the JSON, or null when the writer has no rank or the reader may not see it
 * @returns the rank, or null
 */
export function profileRankFrom(data: Json): ProfileRank | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const rank = rankFrom(data['rank']);
  const chapters = data['chapters'];
  const words = data['words'];
  if (rank === null || typeof chapters !== 'number' || typeof words !== 'number') return null;
  return { rank, chapters, words };
}

/**
 * A writer's rank for their profile.
 *
 * @param client - the Supabase client
 * @param handle - the profile's username
 * @returns the rank, or null before their first published chapter, for a blocked reader or a
 *   private profile
 * @throws the Supabase error when the read fails, so the screen can say so
 */
export async function fetchProfileRank(
  client: AppSupabaseClient,
  handle: string,
): Promise<ProfileRank | null> {
  const { data, error } = await client.rpc('profile_rank', { wanted_handle: handle });
  if (error) throw new Error(`Couldn't read the rank: ${error.message}`);
  return profileRankFrom(data);
}
