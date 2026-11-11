/**
 * A story's ranking place, "#3 in Fantasy" (story S1-E15-05, bundle ANALYTICS-1b).
 *
 * Who calls it: hooks/useRankingPlace.ts.
 * What it calls next: story_rank_place() (…_s1_e15_05_ranking_place.sql), which answers only for
 * a story the caller may see (or staff who may view stories), and only up to place 100.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The place and the category it is in. */
export interface RankingPlace {
  place: number;
  categorySlug: string;
}

/**
 * The answer in the page's words.
 *
 * @param answer - what story_rank_place() returned
 * @returns the place, or null when there is none to show
 */
export function rankingPlaceFromAnswer(answer: Json): RankingPlace | null {
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) return null;
  const { place, category_slug: categorySlug } = answer;
  if (typeof place !== 'number' || typeof categorySlug !== 'string') return null;
  return { place, categorySlug };
}

/**
 * Reads the place.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns the place, or null when there is none to show
 * @throws Error when the database can't be reached
 */
export async function fetchRankingPlace(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<RankingPlace | null> {
  const { data, error } = await client.rpc('story_rank_place', { story_slug: storySlug });
  if (error !== null) throw new Error(`The ranking place could not be read: ${error.message}`);
  return rankingPlaceFromAnswer(data);
}
