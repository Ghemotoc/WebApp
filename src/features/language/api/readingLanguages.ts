/**
 * The story languages a member reads (bundle MARKETS-2, part c; IDEA-20261109-2).
 *
 * Who calls it: hooks/useReadingLanguages.ts (Settings › Language › Reading languages, and the
 * story lists through useReadingLanguageFilter).
 * What it calls next: Supabase. Reading goes to profiles.reading_languages through the
 * profiles_select_own policy (only the member reads their own row); saving goes through
 * set_my_reading_languages(), which checks every code is a story language
 * (supabase/migrations/…_markets2c_reading_languages.sql).
 * Signed out: nothing is read or saved; the lists use the language menu's language instead.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why saving didn't work, in words the panel can explain. */
export type ReadingLanguagesFailure = 'unknown_language' | 'too_many' | 'unreachable';

/** The error a refused save throws. */
export class ReadingLanguagesError extends Error {
  constructor(public readonly failure: ReadingLanguagesFailure) {
    super(`Saving the reading languages failed: ${failure}`);
  }
}

/**
 * Reads the member's saved pick.
 *
 * @param client - the shared Supabase client
 * @param userId - the signed-in member (their own row is the only one they can read)
 * @returns the codes, or null when they haven't picked any (the default applies)
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyReadingLanguages(
  client: AppSupabaseClient,
  userId: string,
): Promise<string[] | null> {
  const { data, error } = await client
    .from('profiles')
    .select('reading_languages')
    .eq('id', userId)
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read the reading languages: ${error.message}`);
  const saved = data?.reading_languages ?? null;
  return saved === null || saved.length === 0 ? null : saved;
}

/**
 * Saves the member's pick; an empty pick goes back to the default.
 *
 * @param client - the shared Supabase client
 * @param codes - the story language codes, in the order they were ticked
 * @returns what was saved, or null for the default
 * Errors: throws ReadingLanguagesError ('unknown_language', 'too_many' or 'unreachable').
 */
export async function saveMyReadingLanguages(
  client: AppSupabaseClient,
  codes: string[],
): Promise<string[] | null> {
  const { data, error } = await client.rpc('set_my_reading_languages', { wanted: codes });
  if (error !== null) {
    if (error.hint === 'unknown_language' || error.hint === 'too_many') {
      throw new ReadingLanguagesError(error.hint);
    }
    throw new ReadingLanguagesError('unreachable');
  }
  return data ?? null;
}
