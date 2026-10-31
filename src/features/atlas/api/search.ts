/**
 * Searches the whole of one story (story S1-E17-30; bundle ATLAS, part h).
 *
 * Who calls it: hooks/useStorySearch.ts.
 * What it calls next: Supabase: search_story()
 * (supabase/migrations/…_s1_e17_30_search_and_links.sql). Only the writer can search.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { AtlasItemReference } from '../lib/itemAddress';

import { checkedAnswer } from './checkedAnswer';

/** One match: what it is, its title and a snippet around the match. */
export interface SearchResult extends AtlasItemReference {
  title: string;
  snippet: string;
}

/** The shortest search the database answers (one letter would match nearly everything). */
export const shortestSearch = 2;

/** The cache key of one search. */
export const storySearchQueryKey = (userId: string | null, slug: string, query: string) => [
  'atlas-search',
  userId,
  slug,
  query,
];

/**
 * Searches a story.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param query - what the writer typed
 * @returns the matches grouped by kind, or null when the story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function searchStory(
  client: AppSupabaseClient,
  slug: string,
  query: string,
): Promise<SearchResult[] | null> {
  const answer = await client.rpc('search_story', { story_slug: slug, query });
  const data = checkedAnswer(answer, 'search the story', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  return data.results as unknown as SearchResult[];
}
