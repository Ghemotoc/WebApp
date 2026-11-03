/**
 * Staff › Settings › Kind-words nudge (bundle ADMIN-2, part d3; Robert, 2 Nov 2026, 22:10): the
 * words and short phrases that make the comment box ask "Still want to send this?" before a
 * comment is sent. Owner and admin edit them; the check runs only in the commenter's browser.
 *
 * Who calls it: hooks/useNudgeWords.ts.
 * What it calls next: the comment_nudge_words table (read through
 * comment_nudge_words_select_signed_in) and admin_add_nudge_word() and admin_remove_nudge_word(),
 * each logged by the database.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { settingsErrorFrom } from './settingsAdmin';

/** One phrase on a nudge list. */
export interface NudgeWord {
  id: string;
  phrase: string;
}

/** The longest list of phrases the screen asks for at once. */
const phrasePageSize = 50;

/**
 * Finds phrases on one language's list, at most 50, alphabetically.
 *
 * @param client - the shared Supabase client
 * @param language - 'ro' or 'en'
 * @param search - part of a phrase; empty for the first 50
 * @returns the phrases and how many match in all
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchNudgeWords(
  client: AppSupabaseClient,
  language: string,
  search: string,
): Promise<{ words: NudgeWord[]; total: number }> {
  let query = client
    .from('comment_nudge_words')
    .select('id, phrase', { count: 'exact' })
    .eq('language', language)
    .order('phrase')
    .limit(phrasePageSize);
  if (search.trim() !== '') query = query.ilike('phrase', `%${search.trim()}%`);
  const { data, error, count } = await query;
  if (error !== null) throw settingsErrorFrom(error);
  return { words: data, total: count ?? data.length };
}

/**
 * Adds a phrase to one language's list.
 *
 * @param client - the shared Supabase client
 * @param language - 'ro' or 'en'
 * @param phrase - the word or phrase, up to 60 characters
 * Errors: throws SettingsAdminError (already_there when the list has it, invalid when empty or
 *   too long).
 */
export async function addNudgeWord(
  client: AppSupabaseClient,
  language: string,
  phrase: string,
): Promise<void> {
  const { error } = await client.rpc('admin_add_nudge_word', {
    word_language: language,
    new_phrase: phrase,
  });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Takes a phrase off its list.
 *
 * @param client - the shared Supabase client
 * @param wordId - the phrase's ID
 * Errors: throws SettingsAdminError (not_found when it was already removed).
 */
export async function removeNudgeWord(client: AppSupabaseClient, wordId: string): Promise<void> {
  const { error } = await client.rpc('admin_remove_nudge_word', { target_word_id: wordId });
  if (error !== null) throw settingsErrorFrom(error);
}
