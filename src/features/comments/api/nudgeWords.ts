/**
 * The kind-words nudge lists, read for the comment box (bundle ADMIN-2, part d3; Robert,
 * 2 Nov 2026).
 *
 * Who calls it: hooks/useKindWordsNudge.ts.
 * What it calls next: the comment_nudge_words table through the policy
 * comment_nudge_words_select_signed_in (anyone signed in reads it). Only reads: staff edit the
 * lists on Staff › Settings (src/features/settings/api/nudgeWords.ts), and nothing is ever written
 * about whether the nudge showed.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Reads every phrase on both lists.
 *
 * @param client - the shared Supabase client
 * @returns the phrases, Romanian and English together
 * Errors: throws with Supabase's message when the lists can't be read; the composer then simply
 *   sends without a nudge.
 */
export async function fetchNudgePhrases(client: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('comment_nudge_words').select('phrase');
  if (error !== null) throw new Error(`Could not read the nudge lists: ${error.message}`);
  return data.map((row) => row.phrase);
}
