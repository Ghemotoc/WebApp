/**
 * Blocks: block or unblock a person by username, and the list of people one blocks (story
 * S1-E5-05).
 *
 * Who calls it: hooks/useBlock.ts and hooks/useMyBlockedAccounts.ts.
 * What it calls next: set_block() and my_blocked_accounts() (…_s1_e5_05_profiles_and_blocks.sql,
 * …_s1_e6_05_follows.sql). Blocking is instant, the other person isn't told, and it ends any
 * follow between the two.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One person on the "Blocked accounts" list. */
export interface BlockedAccount {
  handle: string;
  displayName: string;
  blockedAt: string;
}

/**
 * Blocks or unblocks.
 *
 * @param client - the shared Supabase client
 * @param handle - the person's username
 * @param shouldBlock - true to block, false to unblock
 * @returns whether the person is blocked afterwards
 * Errors: throws with Supabase's message when it is refused or the database can't be reached.
 */
export async function setBlock(
  client: AppSupabaseClient,
  handle: string,
  shouldBlock: boolean,
): Promise<boolean> {
  const { data, error } = await client.rpc('set_block', {
    target_handle: handle,
    should_block: shouldBlock,
  });
  if (error !== null) throw new Error(`Could not change the block: ${error.message}`);
  return (data as unknown as { blocked: boolean }).blocked;
}

/**
 * Reads the people the signed-in person blocks.
 *
 * @param client - the shared Supabase client
 * @returns the list, newest first
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyBlockedAccounts(client: AppSupabaseClient): Promise<BlockedAccount[]> {
  const { data, error } = await client.rpc('my_blocked_accounts');
  if (error !== null) throw new Error(`Could not read your blocked accounts: ${error.message}`);
  return data.map((row) => ({
    handle: row.handle,
    displayName: row.display_name,
    blockedAt: row.blocked_at,
  }));
}
