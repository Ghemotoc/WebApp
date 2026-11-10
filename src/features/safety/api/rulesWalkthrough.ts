/**
 * The rules walkthrough's two database calls (bundle MUST-1, part c; IDEA-20261108-7).
 *
 * Who calls it: hooks/useRulesWalkthrough.ts.
 * What it calls next: needs_rules_walkthrough() and finish_rules_walkthrough()
 * (supabase/migrations/…_must1c_rules_walkthrough.sql). The cards' text is not read here: it is
 * help pages in the CMS, read through useWebsiteContent.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The help pages that hold the cards start with this; their keys sort in the order shown. */
export const rulesCardKeyPrefix = 'rules-walkthrough-';

/**
 * Whether the signed-in person should see the walkthrough before posting: under 18 and not yet
 * finished or skipped.
 *
 * @param client - the shared Supabase client
 * @returns true when it should show
 * @throws the database error when the read fails
 */
export async function needsRulesWalkthrough(client: AppSupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc('needs_rules_walkthrough');
  if (error !== null) throw error;
  return data;
}

/**
 * Records that the signed-in person reached the end or skipped, so it never shows again.
 *
 * @param client - the shared Supabase client
 * @throws the database error when the save fails
 */
export async function finishRulesWalkthrough(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.rpc('finish_rules_walkthrough');
  if (error !== null) throw error;
}
