/**
 * Genres: the bookshop genres a writer picks for a story, and the ones Discover's filter offers
 * (story S1-E3-01; Robert, 26 Nov 2026: "all the genres ... like in bookshops").
 *
 * Who calls it: hooks/useGenres.ts (the new story wizard and story settings) and
 * src/features/discovery/hooks/useStoryListGenres.ts (the See all filter).
 * What it calls next: Supabase.
 * - The whole list: the genres table, through genres_select_public, which leaves out the 18+
 *   genres for anyone under 18 or signed out (rule 18, age_band()).
 * - The filter's list: story_list_genres(), the genres stories this reader may see carry.
 * The genre list lives in the database, not in the locale files, so it never travels with the
 * app's first pages or the reader (e2e/reader-performance.spec.ts).
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The youngest rating a story with a genre may carry (genres.minimum_rating). */
type StoryRatingValue = Database['public']['Enums']['story_rating'];

/** One genre as the screens use it. */
export interface Genre {
  /** The key saved on the story and used in the address ("epic_fantasy"). */
  slug: string;
  /** The bookshop shelf it comes from: fiction, young_adult, children, poetry, drama, nonfiction. */
  groupKey: string;
  /** Its names; other interface languages show the English one. */
  names: { en: string; ro: string };
  /** 18+ for the erotic genres, all ages for the rest. */
  minimumRating: StoryRatingValue;
}

/** One genre in Discover's filter, with how many stories this reader may see carry it. */
export interface ListedGenre extends Pick<Genre, 'slug' | 'groupKey' | 'names'> {
  storyCount: number;
}

/**
 * A genre's name in the interface language: Romanian or English, English for the others until
 * they have names of their own (a follow-up).
 *
 * @param genre - the genre
 * @param language - the interface language ("ro", "en", "sv"...)
 * @returns the name to show
 */
export function genreName(genre: Pick<Genre, 'names'>, language: string): string {
  return language.startsWith('ro') ? genre.names.ro : genre.names.en;
}

/**
 * Reads every genre the signed-in person may pick, in the list's order.
 *
 * @param client - the shared Supabase client
 * @returns the genres (no 18+ genre for anyone under 18 or signed out)
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchGenres(client: AppSupabaseClient): Promise<Genre[]> {
  const { data, error } = await client
    .from('genres')
    .select('slug, group_key, name_en, name_ro, minimum_rating')
    .order('position');
  if (error !== null) throw new Error(`Could not read the genres: ${error.message}`);
  return data.map((row) => ({
    slug: row.slug,
    groupKey: row.group_key,
    names: { en: row.name_en, ro: row.name_ro },
    minimumRating: row.minimum_rating,
  }));
}

/**
 * Reads the genres Discover's filter offers: only those on stories this reader may see.
 *
 * @param client - the shared Supabase client
 * @returns the genres in use, in the list's order
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryListGenres(client: AppSupabaseClient): Promise<ListedGenre[]> {
  const { data, error } = await client.rpc('story_list_genres');
  if (error !== null) throw new Error(`Could not read the genres in use: ${error.message}`);
  return data.map((row) => ({
    slug: row.slug,
    groupKey: row.group_key,
    names: { en: row.name_en, ro: row.name_ro },
    storyCount: row.story_count,
  }));
}
