/**
 * Reads New and rising writers: the "Writers to follow this week" shelf on Discover, and later
 * the home page's section (story S1-E5-11, bundle LOOK-4c; LOOK-3 reuses it).
 *
 * Who calls it: hooks/useRisingWriters.ts.
 * What it calls next: rising_writers() in …_look4c_02_rising_writers.sql, which applies every
 * rule for this reader: only writers who may be suggested (active, their "Suggest me" switch on,
 * 16 or over, or 13 to 15 with their parent's separate yes), nobody across a block, never the
 * reader themselves, and never a user ID. Each latest story is one this reader may read.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { toListedStory, type ListedStory, type ListedStoryRow } from './storyLists';

/** One writer's card. */
export interface RisingWriter {
  handle: string;
  /** The pen name, or the username when there is none. */
  displayName: string;
  /** The category most of their stories are in, for the line under the name. */
  categorySlug: string | null;
  /** Their latest story this reader may read, or null. */
  latestStory: ListedStory | null;
  /** Followers gained in 7 days, only when 5 or more (the writer stats' rule); otherwise null. */
  followersThisWeek: number | null;
}

/** One card as rising_writers() writes it. */
interface RisingWriterRow {
  handle: string;
  display_name: string;
  category_slug: string | null;
  latest_story: ListedStoryRow | null;
  followers_this_week: number | null;
}

/**
 * Reads the writers, best first.
 *
 * @param client - the shared Supabase client (signed out is fine)
 * @returns at most 20 writers; an empty list hides the shelf
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchRisingWriters(client: AppSupabaseClient): Promise<RisingWriter[]> {
  // Step 1: ask the database; it applies every rule for this reader.
  const { data, error } = await client.rpc('rising_writers', { page_size: 20 });
  if (error !== null) throw new Error(error.message);
  // Step 2: turn each card into the screen's shape.
  const rows = (data ?? []) as unknown as RisingWriterRow[];
  return rows.map((row) => ({
    handle: row.handle,
    displayName: row.display_name,
    categorySlug: row.category_slug,
    latestStory: row.latest_story === null ? null : toListedStory(row.latest_story),
    followersThisWeek: row.followers_this_week,
  }));
}
