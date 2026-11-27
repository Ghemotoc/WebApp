/**
 * The languages stories are written in, for the readers' language filters (story S1-E3-01;
 * Robert, 26 Nov 2026: "Only the languages currently written in").
 *
 * Who calls it: hooks/useLanguagesWrittenIn.ts, for the See all filters (StoryListFilters),
 * Search's filters (src/features/search/) and Settings › Reading languages
 * (src/features/language/).
 * What it calls next: story_languages_written_in(), which anyone may call. It counts only stories
 * this reader may see (their rating, blocks, moderation, the country), in any of their language
 * editions, and only once a chapter in that language can be read.
 */
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Reads the language codes at least one story the reader may see is written in.
 *
 * @returns the codes in code order, for example ['en', 'ja', 'ro']
 * Errors: throws with the database's message when they can't be read.
 */
export async function fetchLanguagesWrittenIn(): Promise<string[]> {
  const client = await getSupabaseClient();
  if (client === null) throw new Error('The app is not connected to its database.');
  const { data, error } = await client.rpc('story_languages_written_in');
  if (error !== null) throw new Error(`Could not read the story languages: ${error.message}`);
  return data;
}
