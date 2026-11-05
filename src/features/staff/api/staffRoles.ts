/**
 * Reads and changes staff roles and permissions, for /staff/roles (story S1-E2-07a).
 *
 * Who calls it: hooks/useStaffRoles.ts.
 * What it calls next: the audited database functions in …_s1_e2_07a_staff_roles.sql:
 * admin_list_staff(), admin_grant_role(), admin_remove_role(), admin_set_permission() and
 * admin_set_intern() (bundle ADMIN-2, part e2a). Each
 * checks the caller's role and staff session itself and writes the audit log; this file only
 * passes the answers on. The account to grant a role to is picked from admin_find_accounts()
 * (api/accountSearch.ts, S1-E11-01b), so a grant carries a user ID, never a typed name.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A staff role, as the database lists them. */
export type StaffRole = Enums<'staff_role'>;

/** A staff permission, as the database lists them. */
export type StaffPermission = Enums<'staff_permission'>;

/** One staff member on the page. */
export interface StaffMember {
  userId: string;
  handle: string | null;
  roles: StaffRole[];
  permissions: StaffPermission[];
  /** Marked as an intern: never a picture reviewer (bundle ADMIN-2, part e2a). */
  isIntern: boolean;
}

/**
 * Why a change was refused, in words the page can explain (S1-E11-01b: one reason each, from the
 * HINT the database attaches to every refusal in …_s1_e11_01b_pick_account.sql).
 */
export const staffChangeFailures = [
  'not_allowed',
  'sign_in_again',
  'own_role',
  'owner_only_role',
  'reason_missing',
  'no_such_account',
  'last_owner',
  'not_staff',
  'picture_review_not_allowed',
  'no_workspace_account',
  'refused',
  'unreachable',
] as const;

/** One reason a change was refused. */
export type StaffChangeFailure = (typeof staffChangeFailures)[number];

/** The error a refused change throws. */
export class StaffChangeError extends Error {
  constructor(public readonly failure: StaffChangeFailure) {
    super(`Staff change failed: ${failure}`);
  }
}

/** What Postgres sends back about a refusal: its code and, from S1-E11-01b, a hint. */
export interface DatabaseRefusal {
  code?: string;
  hint?: string;
}

/**
 * Turns a database error into a reason.
 *
 * @param refusal - Postgres's error code and hint
 * @returns the hint when it is one the page knows; otherwise, from the code: not_allowed (42501),
 *   sign_in_again (28000: a sign-in older than staff_fresh_sign_in_minutes, S1-E11-01), refused
 *   (23514, a rule with no hint) or unreachable
 */
export function failureFromRefusal(refusal: DatabaseRefusal): StaffChangeFailure {
  // Step 1: the hint names the exact problem (no such account, reason missing, last owner…).
  const knownHint = staffChangeFailures.find((failure) => failure === refusal.hint);
  if (knownHint !== undefined) return knownHint;
  // Step 2: without a hint, the error code still tells the kind of problem.
  if (refusal.code === '42501') return 'not_allowed';
  if (refusal.code === '28000') return 'sign_in_again';
  if (refusal.code === '23514') return 'refused';
  return 'unreachable';
}

/**
 * Lists everyone with a staff role.
 *
 * @param client - the shared Supabase client
 * @returns the staff, by username
 * Errors: throws StaffChangeError('not_allowed') for anyone but owner and admin.
 */
export async function listStaff(client: AppSupabaseClient): Promise<StaffMember[]> {
  const { data, error } = await client.rpc('admin_list_staff');
  if (error !== null) throw new StaffChangeError(failureFromRefusal(error));
  return data.map((member) => ({
    userId: member.user_id,
    handle: member.handle,
    roles: member.roles,
    permissions: member.permissions,
    isIntern: member.is_intern,
  }));
}

/** One change on the page. */
export type StaffChange =
  | { kind: 'grant_role'; userId: string; role: StaffRole; reason: string }
  | { kind: 'remove_role'; userId: string; role: StaffRole; reason: string }
  | {
      kind: 'set_permission';
      userId: string;
      permission: StaffPermission;
      shouldHold: boolean;
      reason: string;
    }
  | { kind: 'set_intern'; userId: string; isIntern: boolean; reason: string };

/**
 * Makes one change.
 *
 * @param client - the shared Supabase client
 * @param change - what to change, with the reason
 * Errors: throws StaffChangeError with the reason the database gave.
 */
export async function applyStaffChange(
  client: AppSupabaseClient,
  change: StaffChange,
): Promise<void> {
  let result;
  if (change.kind === 'grant_role') {
    result = await client.rpc('admin_grant_role', {
      target_user_id: change.userId,
      granted_role: change.role,
      reason_given: change.reason,
    });
  } else if (change.kind === 'remove_role') {
    result = await client.rpc('admin_remove_role', {
      target_user_id: change.userId,
      removed_role: change.role,
      reason_given: change.reason,
    });
  } else if (change.kind === 'set_intern') {
    result = await client.rpc('admin_set_intern', {
      target_user_id: change.userId,
      should_be_intern: change.isIntern,
      reason_given: change.reason,
    });
  } else {
    result = await client.rpc('admin_set_permission', {
      target_user_id: change.userId,
      changed_permission: change.permission,
      should_hold: change.shouldHold,
      reason_given: change.reason,
    });
  }
  if (result.error !== null) throw new StaffChangeError(failureFromRefusal(result.error));
}

/**
 * Says whether the signed-in person is an owner (owners may grant every role).
 *
 * @param client - the shared Supabase client
 * @param userId - the signed-in person's user ID (an admin can read everyone's roles, so the
 *   question must name whose)
 * @returns true for an owner; false when it can't be read (the safe answer: fewer choices)
 */
export async function isOwner(client: AppSupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from('staff_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'owner');
  return error === null && data.length > 0;
}
