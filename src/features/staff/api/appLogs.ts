/**
 * The app's logs for Staff › Logs: the call log, its failures grouped, and the browser crash log
 * (bundle LOGS-1, part d; Robert, 6 Nov 2026: "every call that's been made, where it failed").
 *
 * Who calls it: hooks/useCallLog.ts, hooks/useCallFailures.ts and hooks/useCrashLog.ts.
 * What it calls next: admin_list_calls() and admin_call_failures()
 * (supabase/migrations/20270204100001_logs1_02_call_log.sql) and admin_list_client_errors()
 * (S1-E1-05). Each checks the caller is owner or admin in a staff session; looking at one
 * person's calls also writes the audit log.
 * The full user ID never reaches the screen: rows carry the username and the first 8 characters
 * (architecture 1.6).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** How many calls one page holds. */
export const callLogPageSize = 100;

/** The kinds of call a filter can pick ("" for all). */
export const callKinds = ['rpc', 'table', 'auth', 'function', 'storage', 'api'] as const;

/** The filters on the Calls view, as typed. */
export interface CallLogFilters {
  onlyFailures: boolean;
  kind: string;
  nameContains: string;
  personHandle: string;
}

/** One call as the screen shows it. */
export interface CallLogRow {
  id: string;
  calledAt: string;
  /** The account's username, null for a visitor or an account with none yet. */
  handle: string | null;
  /** The first 8 characters of the account's user ID, null for a visitor. */
  userIdShort: string | null;
  kind: string;
  name: string;
  method: string;
  outcome: string;
  status: number;
  errorCode: string | null;
  durationMs: number;
  routePath: string;
  appVersion: string;
}

/** One kind of failure, counted. */
export interface CallFailureGroup {
  kind: string;
  name: string;
  status: number;
  errorCode: string | null;
  failures: number;
  accounts: number;
  firstSeen: string;
  lastSeen: string;
}

/** One browser crash. */
export interface CrashRow {
  id: string;
  errorName: string;
  errorMessage: string;
  routePath: string;
  appVersion: string;
  browserFamily: string;
  createdAt: string;
}

/** Why a read failed, in words the page can explain. */
export type AppLogsFailure = 'not_allowed' | 'no_such_account' | 'unreachable';

/** The error a refused read throws. */
export class AppLogsError extends Error {
  constructor(public readonly failure: AppLogsFailure) {
    super(`App logs call failed: ${failure}`);
  }
}

/**
 * Turns Postgres's error code into a reason.
 *
 * @param code - the code, for example "42501"
 * @returns not_allowed (42501), no_such_account (P0002) or unreachable
 */
function failureFromCode(code: string | undefined): AppLogsFailure {
  if (code === '42501') return 'not_allowed';
  if (code === 'P0002') return 'no_such_account';
  return 'unreachable';
}

/**
 * One database row in the screen's words. The handle and user ID are typed as possibly empty
 * because a visitor's call has neither (the generated types can't say so for a table function).
 *
 * @param row - as admin_list_calls() returns it
 * @returns the call
 */
function callFromRow(row: {
  id: string;
  called_at: string;
  user_id: string | null;
  handle: string | null;
  call_kind: string;
  call_name: string;
  http_method: string;
  outcome: string;
  status_code: number;
  error_code: string | null;
  duration_ms: number;
  route_path: string;
  app_version: string;
}): CallLogRow {
  return {
    id: row.id,
    calledAt: row.called_at,
    handle: row.handle,
    userIdShort: row.user_id === null ? null : row.user_id.slice(0, 8),
    kind: row.call_kind,
    name: row.call_name,
    method: row.http_method,
    outcome: row.outcome,
    status: row.status_code,
    errorCode: row.error_code,
    durationMs: row.duration_ms,
    routePath: row.route_path,
    appVersion: row.app_version,
  };
}

/**
 * Reads one page of calls, newest first.
 *
 * @param client - the shared Supabase client
 * @param filters - the filters as searched
 * @param before - the time of the last call on the previous page, or null for the first page
 * @returns the page's calls (one more than a page means there is a next page)
 * Errors: throws AppLogsError with the reason.
 */
export async function fetchCalls(
  client: AppSupabaseClient,
  filters: CallLogFilters,
  before: string | null,
): Promise<CallLogRow[]> {
  // Step 1: the last 30 days (all the log keeps), with the filters.
  const { data, error } = await client.rpc('admin_list_calls', {
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    only_failures: filters.onlyFailures,
    kind: filters.kind === '' ? undefined : filters.kind,
    name_contains: filters.nameContains.trim() === '' ? undefined : filters.nameContains.trim(),
    person_handle: filters.personHandle.trim() === '' ? undefined : filters.personHandle.trim(),
    before: before ?? undefined,
    max_rows: callLogPageSize + 1,
  });
  if (error !== null) throw new AppLogsError(failureFromCode(error.code));
  // Step 2: the rows in the screen's words, with the user ID shortened.
  return data.map(callFromRow);
}

/**
 * One group of failures in the screen's words (a failure with no code has none, which the
 * generated types can't say for a table function).
 *
 * @param row - as admin_call_failures() returns it
 * @returns the group
 */
function failureGroupFromRow(row: {
  call_kind: string;
  call_name: string;
  status_code: number;
  error_code: string | null;
  failures: number;
  accounts: number;
  first_seen: string;
  last_seen: string;
}): CallFailureGroup {
  return {
    kind: row.call_kind,
    name: row.call_name,
    status: row.status_code,
    errorCode: row.error_code,
    failures: row.failures,
    accounts: row.accounts,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
  };
}

/**
 * Reads the failures of the last 7 days, grouped.
 *
 * @param client - the shared Supabase client
 * @returns the groups, most failures first
 * Errors: throws AppLogsError with the reason.
 */
export async function fetchCallFailures(client: AppSupabaseClient): Promise<CallFailureGroup[]> {
  const { data, error } = await client.rpc('admin_call_failures', {});
  if (error !== null) throw new AppLogsError(failureFromCode(error.code));
  return data.map(failureGroupFromRow);
}

/**
 * Reads the browser crashes of the last 7 days.
 *
 * @param client - the shared Supabase client
 * @returns at most 200 crashes, newest first
 * Errors: throws AppLogsError with the reason.
 */
export async function fetchCrashes(client: AppSupabaseClient): Promise<CrashRow[]> {
  const { data, error } = await client.rpc('admin_list_client_errors', {});
  if (error !== null) throw new AppLogsError(failureFromCode(error.code));
  return data.map((row) => ({
    id: row.id,
    errorName: row.error_name,
    errorMessage: row.error_message,
    routePath: row.route_path,
    appVersion: row.app_version,
    browserFamily: row.browser_family,
    createdAt: row.created_at,
  }));
}
