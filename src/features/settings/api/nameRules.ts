/**
 * Staff › Settings › Reserved names and the username word lists (stories S1-E11-03 and S1-E2-04):
 * names nobody can take, and the words a username or pen name may not contain.
 *
 * Who calls it: hooks/useNameRules.ts.
 * What it calls next: the reserved_names and username_word_lists tables (owner and admin read them
 * through reserved_names_select_admin and username_word_lists_select_admin) and
 * admin_add_reserved_name(), admin_remove_reserved_name(), admin_add_name_word() and
 * admin_remove_name_word(), each logged by the database.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { settingsErrorFrom } from './settingsAdmin';

/** How a name or word matches: anywhere in a name, as a whole word, or the whole name. */
export type MatchRule = 'anywhere' | 'whole_word' | 'whole_name';

/** One reserved name. */
export interface ReservedName {
  id: string;
  name: string;
  matchRule: MatchRule;
  /** 'system' names came with the platform and stay; 'staff' names were added on this screen. */
  isSystem: boolean;
}

/** One word on a username word list. */
export interface NameWord {
  id: string;
  language: string;
  word: string;
  matchRule: MatchRule;
}

/** The longest list of words the screen asks for at once. */
const wordPageSize = 50;

/**
 * Reads every reserved name, alphabetically.
 *
 * @param client - the shared Supabase client
 * @returns the names
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchReservedNames(client: AppSupabaseClient): Promise<ReservedName[]> {
  const { data, error } = await client
    .from('reserved_names')
    .select('id, name, match_rule, reason')
    .order('name');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    matchRule: row.match_rule as MatchRule,
    isSystem: row.reason === 'system',
  }));
}

/**
 * Reserves a name.
 *
 * @param client - the shared Supabase client
 * @param name - the name to reserve
 * @param matchRule - how it matches
 * Errors: throws SettingsAdminError (already_there for a name already reserved).
 */
export async function addReservedName(
  client: AppSupabaseClient,
  name: string,
  matchRule: MatchRule,
): Promise<void> {
  const { error } = await client.rpc('admin_add_reserved_name', {
    new_name: name,
    how_it_matches: matchRule,
  });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Frees a name staff reserved.
 *
 * @param client - the shared Supabase client
 * @param nameId - the reserved name's ID
 * Errors: throws SettingsAdminError (invalid for a system name).
 */
export async function removeReservedName(client: AppSupabaseClient, nameId: string) {
  const { error } = await client.rpc('admin_remove_reserved_name', { target_name_id: nameId });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Finds words on one language's list, at most 50, alphabetically.
 *
 * @param client - the shared Supabase client
 * @param language - 'ro' or 'en'
 * @param search - part of the word; empty for the first 50
 * @returns the words and whether there are more than shown
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchNameWords(
  client: AppSupabaseClient,
  language: string,
  search: string,
): Promise<{ words: NameWord[]; total: number }> {
  let query = client
    .from('username_word_lists')
    .select('id, language, word, match_rule', { count: 'exact' })
    .eq('language', language)
    .order('word')
    .limit(wordPageSize);
  if (search.trim() !== '') query = query.ilike('word', `%${search.trim()}%`);
  const { data, error, count } = await query;
  if (error !== null) throw settingsErrorFrom(error);
  const words = data.map((row) => ({
    id: row.id,
    language: row.language,
    word: row.word,
    matchRule: row.match_rule as MatchRule,
  }));
  return { words, total: count ?? words.length };
}

/**
 * Adds a word to one language's list.
 *
 * @param client - the shared Supabase client
 * @param language - 'ro' or 'en'
 * @param word - the word
 * @param matchRule - 'anywhere' or 'whole_word'
 * Errors: throws SettingsAdminError (already_there when the list has it).
 */
export async function addNameWord(
  client: AppSupabaseClient,
  language: string,
  word: string,
  matchRule: MatchRule,
): Promise<void> {
  const { error } = await client.rpc('admin_add_name_word', {
    word_language: language,
    new_word: word,
    how_it_matches: matchRule,
  });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Takes a word off its list.
 *
 * @param client - the shared Supabase client
 * @param wordId - the word's ID
 * Errors: throws SettingsAdminError.
 */
export async function removeNameWord(client: AppSupabaseClient, wordId: string): Promise<void> {
  const { error } = await client.rpc('admin_remove_name_word', { target_word_id: wordId });
  if (error !== null) throw settingsErrorFrom(error);
}
