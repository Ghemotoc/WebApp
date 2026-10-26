/**
 * User management in the admin site: find accounts, read one account, and act on it (story
 * S1-E11-02; architecture 1.8.2 to 1.8.4, screen 8.5).
 *
 * Who calls it: hooks/useUserLookup.ts, hooks/useAccount.ts and hooks/useAccountActions.ts.
 * What it calls next: admin_user_lookup(), admin_user_account(), admin_account_open_cases(),
 * admin_reset_pen_name() and admin_sign_out_everywhere() (…_s1_e11_02_user_management.sql),
 * admin_apply_sanction() (S1-E10-06) and admin_approve_username() (S1-E2-04). Every function
 * checks the caller's role and staff session itself and writes the audit log; this file only
 * passes the answers on. Staff may use user IDs (architecture 1.6); members never see them.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { StaffRole } from './staffRoles';

/** Why a call failed, in words the page can explain (the database's hints, then the codes). */
export const userManagementFailures = [
  'not_allowed',
  'own_account',
  'reason_missing',
  'no_such_account',
  'no_pen_name',
  'refused',
  'unreachable',
] as const;
export type UserManagementFailure = (typeof userManagementFailures)[number];

/** The error a refused call throws. */
export class UserManagementError extends Error {
  constructor(public readonly failure: UserManagementFailure) {
    super(`User management call failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param refusal - Postgres's error code and hint
 * @returns the hint when the page knows it; otherwise not_allowed (42501), refused (23514) or
 *   unreachable
 */
export function userManagementFailureOf(refusal: {
  code?: string;
  hint?: string;
}): UserManagementFailure {
  const knownHint = userManagementFailures.find((failure) => failure === refusal.hint);
  if (knownHint !== undefined) return knownHint;
  if (refusal.code === '42501') return 'not_allowed';
  if (refusal.code === '23514') return 'refused';
  return 'unreachable';
}

/** One account in the search results. */
export interface UserMatch {
  userId: string;
  handle: string | null;
  penName: string | null;
  status: Enums<'account_status'>;
  ageCheckResult: Enums<'age_check_result'> | null;
  ageCheckedAt: string | null;
  staffRoles: StaffRole[];
  matchedBy: 'username' | 'pen_name' | 'email' | 'user_id';
  /** The kinds of sanction the account has had; null when the caller's role may not see them. */
  sanctionKinds: Enums<'sanction_kind'>[] | null;
  /** How many open cases about it the caller may see; null when the role may not see cases. */
  openCaseCount: number | null;
}

/** The shortest search the database answers. */
export const shortestUserSearch = 2;

/**
 * Searches accounts by username, pen name, whole email (logged) or user ID.
 *
 * @param client - the shared Supabase client
 * @param searchText - what the person typed
 * @returns up to 20 accounts, an email or ID match first
 * Errors: throws UserManagementError (not_allowed for the content editor and members).
 */
export async function lookUpUsers(
  client: AppSupabaseClient,
  searchText: string,
): Promise<UserMatch[]> {
  const { data, error } = await client.rpc('admin_user_lookup', { search_text: searchText });
  if (error !== null) throw new UserManagementError(userManagementFailureOf(error));
  return data.map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    penName: row.pen_name,
    status: row.account_status,
    ageCheckResult: row.age_check_result,
    ageCheckedAt: row.age_checked_at,
    staffRoles: row.staff_roles,
    matchedBy: row.matched_by as UserMatch['matchedBy'],
    sanctionKinds: row.sanction_kinds,
    openCaseCount: row.open_case_count,
  }));
}

/** One account's summary, and what the caller may do on it. */
export interface AccountSummary {
  userId: string;
  handle: string | null;
  penName: string | null;
  joinedAt: string;
  status: Enums<'account_status'>;
  ageBand: Enums<'age_band'>;
  ageCheckResult: Enums<'age_check_result'> | null;
  ageCheckedAt: string | null;
  ageCheckMethod: string | null;
  emailMasked: string | null;
  staffRoles: StaffRole[];
  mayViewSanctions: boolean;
  mayAct: boolean;
  mayRevealEmail: boolean;
  mayReadAuditLog: boolean;
}

/**
 * Reads one account.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @returns the summary
 * Errors: throws UserManagementError (not_allowed, no_such_account, unreachable).
 */
export async function fetchAccount(
  client: AppSupabaseClient,
  userId: string,
): Promise<AccountSummary> {
  const { data, error } = await client.rpc('admin_user_account', { target_user_id: userId });
  if (error !== null) throw new UserManagementError(userManagementFailureOf(error));
  const row = data[0];
  if (row === undefined) throw new UserManagementError('no_such_account');
  return {
    userId: row.user_id,
    handle: row.handle,
    penName: row.pen_name,
    joinedAt: row.joined_at,
    status: row.account_status,
    ageBand: row.age_band,
    ageCheckResult: row.age_check_result,
    ageCheckedAt: row.age_checked_at,
    ageCheckMethod: row.age_check_method,
    emailMasked: row.email_masked,
    staffRoles: row.staff_roles,
    mayViewSanctions: row.may_view_sanctions,
    mayAct: row.may_act,
    mayRevealEmail: row.may_reveal_email,
    mayReadAuditLog: row.may_read_audit_log,
  };
}

/** One open case about an account. */
export interface AccountOpenCase {
  caseId: string;
  reference: string;
  itemType: Enums<'reportable_type'>;
  topReason: Enums<'report_reason'> | null;
  tier: Enums<'case_tier'>;
  deadlineAt: string;
}

/**
 * Lists the open cases about an account that the caller may see, most urgent first.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @returns the cases
 * Errors: throws UserManagementError (not_allowed for anyone outside moderation staff).
 */
export async function fetchOpenCases(
  client: AppSupabaseClient,
  userId: string,
): Promise<AccountOpenCase[]> {
  const { data, error } = await client.rpc('admin_account_open_cases', { target_user_id: userId });
  if (error !== null) throw new UserManagementError(userManagementFailureOf(error));
  return data.map((row) => ({
    caseId: row.case_id,
    reference: row.reference,
    itemType: row.item_type,
    topReason: row.top_reason,
    tier: row.tier,
    deadlineAt: row.deadline_at,
  }));
}

/** An action on an account, as the page asks for it. Every one carries a reason or note. */
export type AccountAction =
  | { kind: 'warning' | 'ban'; reason: string }
  | { kind: 'suspension'; days: number; reason: string }
  | { kind: 'reset_pen_name'; reason: string }
  | { kind: 'sign_out_everywhere'; reason: string }
  | { kind: 'approve_username'; nameKind: 'handle' | 'pen_name'; name: string; reason: string }
  // S1-E2-12: the person asked staff to fix their birthday; null month clears it.
  | { kind: 'correct_birthday'; month: number | null; day: number | null; reason: string };

/**
 * Asks the database for the right function for an action.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @param action - what to do, with its reason
 * @returns Postgres's error, or null when it was done
 */
async function callForAction(client: AppSupabaseClient, userId: string, action: AccountAction) {
  if (action.kind === 'reset_pen_name') {
    const answer = await client.rpc('admin_reset_pen_name', {
      target_user_id: userId,
      reason_given: action.reason,
    });
    return answer.error;
  }
  if (action.kind === 'sign_out_everywhere') {
    const answer = await client.rpc('admin_sign_out_everywhere', {
      target_user_id: userId,
      reason_given: action.reason,
    });
    return answer.error;
  }
  if (action.kind === 'approve_username') {
    const answer = await client.rpc('admin_approve_username', {
      target_user_id: userId,
      name_kind: action.nameKind,
      approved_name: action.name,
      reason_given: action.reason,
    });
    return answer.error;
  }
  if (action.kind === 'correct_birthday') {
    // admin_set_birthday() checks the role and writes the before and after to the audit log.
    const answer = await client.rpc('admin_set_birthday', {
      target_user_id: userId,
      reason_given: action.reason,
      wanted_month: action.month ?? undefined,
      wanted_day: action.day ?? undefined,
    });
    return answer.error;
  }
  // Warn, suspend and ban are sanctions (S1-E10-06), applied outside any case.
  const answer = await client.rpc('admin_apply_sanction', {
    target_user_id: userId,
    wanted_kind: action.kind,
    days: action.kind === 'suspension' ? action.days : undefined,
    note_text: action.reason,
  });
  return answer.error;
}

/**
 * Does one action on an account.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @param action - what to do, with its reason
 * Errors: throws UserManagementError with the database's reason.
 */
export async function actOnAccount(
  client: AppSupabaseClient,
  userId: string,
  action: AccountAction,
): Promise<void> {
  const error = await callForAction(client, userId, action);
  if (error !== null) throw new UserManagementError(userManagementFailureOf(error));
}
