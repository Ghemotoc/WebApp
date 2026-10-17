/**
 * Asks whether an invite code is still good (story S1-E2-01).
 *
 * Who calls it: hooks/useInviteCheck.ts, for the sign-up page while invite_only is on.
 * What it calls next: check_invite(code) (supabase/migrations/…_s1_e2_01_invites.sql), which anyone
 * may call. It answers only "valid", "ended" or "unknown", never the invite itself.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** What the database says about a code. */
export type InviteStatus = 'valid' | 'ended' | 'unknown';

/**
 * Checks one code.
 *
 * @param client - the shared Supabase client
 * @param code - as typed or taken from the /join/<code> link
 * @returns the code's status
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function checkInvite(client: AppSupabaseClient, code: string): Promise<InviteStatus> {
  const { data, error } = await client.rpc('check_invite', { code });
  if (error !== null) throw new Error(`Could not check the invitation: ${error.message}`);
  return data === 'valid' || data === 'ended' ? data : 'unknown';
}
