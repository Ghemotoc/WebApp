/**
 * The full list of accounts in Staff › Users: one page at a time, newest first (Robert, 26 Nov
 * 2026: "I actually want to be able to see the full list of users in the backend").
 *
 * Who calls it: hooks/useAccountList.ts.
 * What it calls next: admin_list_accounts()
 * (supabase/migrations/20270205100570_staff_users_list.sql). The database lets only the owner and
 * admins in, in a staff session, and logs every page read; this file only passes the answer on.
 * Kept apart from the table that draws it, so the staff redesign (STAFF-4, story S1-E11-47) can
 * rehouse the table without touching the data side.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { UserManagementError, userManagementFailureOf } from './userManagement';

/** How many accounts one page holds (the database takes 1 to 100). */
export const accountListPageSize = 50;

/** One account as the list shows it. */
export interface ListedAccount {
  userId: string;
  handle: string | null;
  penName: string | null;
  /** The email with most of its name hidden ("r***@gmail.com"); "Show" reveals it, logged. */
  emailMasked: string | null;
  /** The two-letter country code, or null when the account has none. */
  countryCode: string | null;
  ageBand: Enums<'age_band'>;
  joinedAt: string;
  /** The last day the account was used (a date, no time), or null when there is none. */
  lastUsedOn: string | null;
  status: Enums<'account_status'>;
  sanctionKinds: Enums<'sanction_kind'>[];
  /** Open cases about the account that the caller may see (for the redesign's side panel). */
  openCaseCount: number;
}

/** One page of accounts, with how many there are in all. */
export interface AccountListPage {
  accounts: ListedAccount[];
  totalCount: number;
}

/**
 * Reads one page of every account, newest first.
 *
 * @param client - the shared Supabase client
 * @param pageNumber - from 1
 * @returns the page and the number of accounts (0 when there are none)
 * Errors: throws UserManagementError (not_allowed for anyone but the owner and admins).
 */
export async function fetchAccountList(
  client: AppSupabaseClient,
  pageNumber: number,
): Promise<AccountListPage> {
  // Step 1: ask the database for the page; it checks the role and logs the read.
  const { data, error } = await client.rpc('admin_list_accounts', {
    page_number: pageNumber,
    page_size: accountListPageSize,
  });
  if (error !== null) throw new UserManagementError(userManagementFailureOf(error));
  // Step 2: put each row in the screen's words. Every row carries the same total.
  return {
    accounts: data.map((row) => ({
      userId: row.user_id,
      handle: row.handle,
      penName: row.pen_name,
      emailMasked: row.email_masked,
      countryCode: row.country_code,
      ageBand: row.age_band,
      joinedAt: row.joined_at,
      lastUsedOn: row.last_used_on,
      status: row.account_status,
      sanctionKinds: row.sanction_kinds,
      openCaseCount: row.open_case_count,
    })),
    totalCount: data[0]?.total_count ?? 0,
  };
}
