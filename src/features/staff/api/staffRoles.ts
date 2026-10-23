/**
 * Reads and changes staff roles and permissions, for /staff/roles (story S1-E2-07a).
 *
 * Who calls it: hooks/useStaffRoles.ts.
 * What it calls next: the audited database functions in …_s1_e2_07a_staff_roles.sql:
 * admin_list_staff(), admin_user_id_for_handle(), admin_grant_role(), admin_remove_role() and
 * admin_set_permission(). Each checks the caller's role and staff session itself and writes the
 * audit log; this file only passes the answers on.
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
}

/** Why a change was refused, in words the page can explain. */
export type StaffChangeFailure = 'not_allowed' | 'sign_in_again' | 'refused' | 'unreachable';

/** The error a refused change throws. */
export class StaffChangeError extends Error {
  constructor(public readonly failure: StaffChangeFailure) {
    super(`Staff change failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501: not the caller's to change), sign_in_again (28000: the person's
 *   sign-in is older than staff_fresh_sign_in_minutes, S1-E11-01), refused (23514: a rule such as
 *   the reason or the last owner) or unreachable
 */
function failureFromCode(code: string | undefined): StaffChangeFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '28000') return 'sign_in_again';
  if (code === '23514') return 'refused';
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
  if (error !== null) throw new StaffChangeError(failureFromCode(error.code));
  return data.map((member) => ({
    userId: member.user_id,
    handle: member.handle,
    roles: member.roles,
    permissions: member.permissions,
  }));
}

/** One change on the page. */
export type StaffChange =
  | { kind: 'grant_role'; handle: string; role: StaffRole; reason: string }
  | { kind: 'remove_role'; userId: string; role: StaffRole; reason: string }
  | {
      kind: 'set_permission';
      userId: string;
      permission: StaffPermission;
      shouldHold: boolean;
      reason: string;
    };

/**
 * Finds the account for a username, for a new grant.
 *
 * @param client - the shared Supabase client
 * @param handle - the username, with or without "@"
 * @returns the user ID
 * Errors: throws StaffChangeError('refused') when no account has that username.
 */
async function userIdForHandle(client: AppSupabaseClient, handle: string): Promise<string> {
  const { data, error } = await client.rpc('admin_user_id_for_handle', { wanted_handle: handle });
  if (error !== null) throw new StaffChangeError(failureFromCode(error.code));
  if (data === null) throw new StaffChangeError('refused');
  return data;
}

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
    const userId = await userIdForHandle(client, change.handle);
    result = await client.rpc('admin_grant_role', {
      target_user_id: userId,
      granted_role: change.role,
      reason_given: change.reason,
    });
  } else if (change.kind === 'remove_role') {
    result = await client.rpc('admin_remove_role', {
      target_user_id: change.userId,
      removed_role: change.role,
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
  if (result.error !== null) throw new StaffChangeError(failureFromCode(result.error.code));
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
