/**
 * The full list of accounts in Staff › Users: one page at a time, newest first (Robert, 26 Nov
 * 2026: "I actually want to be able to see the full list of users in the backend"). Later the
 * same evening (20:17 UTC): deleted accounts are left out unless the Status filter asks for
 * them, a Status filter picks one account state, and a page holds 5 unless staff pick 10, 25 or
 * 50 (S1-E11-02 follow-up).
 *
 * Who calls it: hooks/useAccountList.ts.
 * What it calls next: admin_list_accounts()
 * (supabase/migrations/20270205100750_s1e11_02_users_list_filters.sql). The database lets only the owner and
 * admins in, in a staff session, and logs every page read; this file only passes the answer on.
 * Kept apart from the table that draws it, so the staff redesign (STAFF-4, story S1-E11-47) can
 * rehouse the table without touching the data side.
 */
import { Constants, type Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { UserManagementError, userManagementFailureOf } from './userManagement';

/** The page sizes staff can pick in "Per page" (the database takes 1 to 100). */
export const accountListPageSizes = [5, 10, 25, 50] as const;

/** One of the page sizes on offer. */
export type AccountListPageSize = (typeof accountListPageSizes)[number];

/** The page size the list opens with (Robert, 26 Nov 2026: "the user list should cap at 5"). */
export const defaultAccountListPageSize: AccountListPageSize = 5;

/** The states staff look for most come first in the Status filter; deleted comes last. */
const firstStatuses: Enums<'account_status'>[] = ['active', 'suspended', 'banned'];

/**
 * Every account state the Status filter offers, in the order it lists them: active, suspended
 * and banned first, then the waiting and read-only states, deleted last. Read from the
 * generated enum, so a new state account_state() learns shows up here on its own.
 */
export const accountStatusFilters: Enums<'account_status'>[] = [
  ...firstStatuses,
  ...Constants.public.Enums.account_status.filter(
    (status) => !firstStatuses.includes(status) && status !== 'deleted',
  ),
  'deleted',
];

/** Which page to read, how big, and which accounts. */
export interface AccountListRequest {
  pageNumber: number;
  pageSize: AccountListPageSize;
  /** One account state, or null for every account that isn't deleted. */
  status: Enums<'account_status'> | null;
}

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

/** One page of accounts, with how many match the filter in all. */
export interface AccountListPage {
  accounts: ListedAccount[];
  totalCount: number;
}

/**
 * Reads one page of accounts, newest first.
 *
 * @param client - the shared Supabase client
 * @param request - the page number (from 1), the page size and the status, or null for every
 *   account that isn't deleted
 * @returns the page and the number of matching accounts (0 when there are none)
 * Errors: throws UserManagementError (not_allowed for anyone but the owner and admins).
 */
export async function fetchAccountList(
  client: AppSupabaseClient,
  request: AccountListRequest,
): Promise<AccountListPage> {
  // Step 1: ask the database for the page; it checks the role, filters and logs the read.
  // No status sends no filter, and the database then leaves deleted accounts out.
  const { data, error } = await client.rpc('admin_list_accounts', {
    page_number: request.pageNumber,
    page_size: request.pageSize,
    ...(request.status === null ? {} : { status_filter: request.status }),
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
