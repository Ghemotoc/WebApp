/**
 * Occasional news emails: the person's own opt-in (bundle WAITLIST-1; the rule is S1-E7-02's).
 *
 * Who calls it: hooks/useNewsEmails.ts, for the switch in Settings › Notifications.
 * What it calls next: the person's own profile row (profiles_select_own lets them read
 * marketing_email_opt_in) and set_marketing_email_opt_in(), which refuses anyone under 18 or of
 * unknown age (Q50; Law 506/2004: marketing email only with consent).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why saving the choice didn't work. */
export type NewsEmailsFailure = 'adults_only' | 'unreachable';

/** The error a failed call throws. */
export class NewsEmailsError extends Error {
  constructor(public readonly failure: NewsEmailsFailure) {
    super(`News emails call failed: ${failure}`);
  }
}

/**
 * Reads whether the person asked for news emails.
 *
 * @param client - the shared Supabase client
 * @param userId - the signed-in person's ID (their own row only)
 * @returns true when they opted in
 * Errors: throws NewsEmailsError('unreachable') when the row can't be read.
 */
export async function fetchNewsEmails(client: AppSupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from('profiles')
    .select('marketing_email_opt_in')
    .eq('id', userId)
    .single();
  if (error !== null) throw new NewsEmailsError('unreachable');
  return data.marketing_email_opt_in;
}

/**
 * Saves the choice.
 *
 * @param client - the shared Supabase client
 * @param wanted - true to get news emails
 * Errors: throws NewsEmailsError('adults_only') when someone under 18 asks for them.
 */
export async function saveNewsEmails(client: AppSupabaseClient, wanted: boolean): Promise<void> {
  const { error } = await client.rpc('set_marketing_email_opt_in', { wanted });
  if (error === null) return;
  throw new NewsEmailsError(error.code === '23514' ? 'adults_only' : 'unreachable');
}
