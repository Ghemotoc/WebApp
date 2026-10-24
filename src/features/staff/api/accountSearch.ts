/**
 * Finds existing accounts to give a staff role to, and shows one account's email on request
 * (story S1-E11-01b; Robert's request of 24 Oct 2026: pick an account, don't type an identifier).
 *
 * Who calls it: hooks/useAccountSearch.ts.
 * What it calls next: admin_find_accounts() and admin_reveal_email() in
 * …_s1_e11_01b_pick_account.sql. Both check that the caller is an owner or admin in a staff
 * session. An email is matched only whole and comes back masked ("r***@gmail.com"); finding an
 * account by its email and "Show email" are each logged as a sensitive read (architecture 1.8.3).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromRefusal, StaffChangeError, type StaffRole } from './staffRoles';

/** What a search matched on. */
export type AccountMatchKind = 'username' | 'pen_name' | 'email';

/** One account the search found. */
export interface AccountMatch {
  userId: string;
  handle: string | null;
  penName: string | null;
  /** The email with all but its first letter hidden, for example "r***@gmail.com". */
  emailMasked: string | null;
  matchedBy: AccountMatchKind;
  /** The staff roles the account already holds (empty for a member). */
  staffRoles: StaffRole[];
}

/** The shortest search the database answers (one letter would list everyone). */
export const shortestSearch = 2;

/**
 * Searches existing accounts.
 *
 * @param client - the shared Supabase client
 * @param searchText - a username (the start is enough), a pen name (any part) or a whole email
 * @returns at most 10 accounts, an email match first
 * Errors: throws StaffChangeError with the reason (not_allowed for anyone but owner and admin).
 */
export async function findAccounts(
  client: AppSupabaseClient,
  searchText: string,
): Promise<AccountMatch[]> {
  const { data, error } = await client.rpc('admin_find_accounts', { search_text: searchText });
  if (error !== null) throw new StaffChangeError(failureFromRefusal(error));
  return data.map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    penName: row.pen_name,
    emailMasked: row.email_masked,
    matchedBy: row.matched_by as AccountMatchKind,
    staffRoles: row.staff_roles,
  }));
}

/**
 * Shows one account's whole email address. The database logs it before answering.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @returns the email address
 * Errors: throws StaffChangeError (not_allowed, no_such_account or unreachable).
 */
export async function revealEmail(client: AppSupabaseClient, userId: string): Promise<string> {
  const { data, error } = await client.rpc('admin_reveal_email', { target_user_id: userId });
  if (error !== null) throw new StaffChangeError(failureFromRefusal(error));
  return data;
}
