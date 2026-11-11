/**
 * Custom staff roles: the one way the Roles page reads and changes them (story S1-E11-33, bundle
 * CMS-2a).
 *
 * A custom role is a name, a short description and, for each admin area, View or Change ('view' or
 * 'act' in the database). The database decides everything: who may make one, what an admin may put
 * in it, that nobody changes their own roles, and the audit log (admin_* functions in migration
 * 20270205100207). This file only turns its answers into typed values and its refusals into one
 * failure name the page can show.
 * Who calls it: hooks/useCustomRoles.ts. What it calls: admin_custom_roles(),
 * admin_save_custom_role(), admin_remove_custom_role() and admin_set_custom_role_holder().
 */
import { z } from 'zod';

import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromRefusal, type DatabaseRefusal, type StaffChangeFailure } from './staffRoles';

/** What a role may do in one area: look ('view') or also change ('act'). */
export type CustomRoleAccess = 'view' | 'act';

/** One area of a custom role. */
export interface CustomRoleArea {
  area: string;
  access: CustomRoleAccess;
}

/** One person who holds a custom role. */
export interface CustomRoleHolder {
  userId: string;
  handle: string | null;
}

/** One custom role as the Roles page shows it. */
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  areas: CustomRoleArea[];
  holders: CustomRoleHolder[];
  /** False when the role holds more than the signed-in person: they may not change or give it. */
  isInReach: boolean;
}

/** An area the signed-in person may put in a role, and the most they may give in it. */
export interface AssignableArea {
  area: string;
  highest: CustomRoleAccess;
}

/** What admin_custom_roles() answers, parsed. */
export interface CustomRolesOverview {
  roles: CustomRole[];
  assignable: AssignableArea[];
}

/** The shape admin_custom_roles() answers with, checked before the page trusts it. */
const overviewSchema = z.object({
  roles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      in_reach: z.boolean(),
      areas: z.array(z.object({ area: z.string(), access: z.enum(['view', 'act']) })),
      holders: z.array(z.object({ user_id: z.string(), handle: z.string().nullable() })),
    }),
  ),
  assignable: z.array(z.object({ area: z.string(), highest: z.enum(['view', 'act']) })),
});

/** The refusals only custom roles have, on top of those the built-in roles share. */
export const customRoleFailures = [
  'bad_name',
  'name_taken',
  'no_areas',
  'bad_areas',
  'area_out_of_reach',
  'no_such_role',
  'role_out_of_reach',
] as const;

/** One way a custom role change can fail. */
export type CustomRoleFailure = (typeof customRoleFailures)[number] | StaffChangeFailure;

/** A refused custom role change, carrying the failure the page names. */
export class CustomRoleError extends Error {
  constructor(public readonly failure: CustomRoleFailure) {
    super(`Custom role change failed: ${failure}`);
  }
}

/**
 * Turns a database refusal into one failure name.
 *
 * @param refusal - the error the database gave (code and hint)
 * @returns the failure; "area_out_of_reach:<area>" counts as area_out_of_reach
 */
export function customRoleFailureFrom(refusal: DatabaseRefusal): CustomRoleFailure {
  // Step 1: the hint before the colon names a custom role problem, when it is one.
  const hintName = (refusal.hint ?? '').split(':')[0];
  const known = customRoleFailures.find((failure) => failure === hintName);
  if (known !== undefined) return known;
  // Step 2: anything else is a refusal the built-in roles share (not allowed, own role…).
  return failureFromRefusal(refusal);
}

/**
 * Turns the parsed answer into the page's shape.
 *
 * @param answer - admin_custom_roles()'s answer after the schema check
 * @returns the roles and the areas the person may give
 */
function toOverview(answer: z.infer<typeof overviewSchema>): CustomRolesOverview {
  return {
    roles: answer.roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      areas: role.areas,
      isInReach: role.in_reach,
      holders: role.holders.map((holder) => ({ userId: holder.user_id, handle: holder.handle })),
    })),
    assignable: answer.assignable,
  };
}

/**
 * Reads the custom roles and what the signed-in person may put in one.
 *
 * @param client - the signed-in Supabase client
 * @returns the overview
 * @throws CustomRoleError when the database refuses or answers in a shape we don't know
 */
export async function fetchCustomRoles(client: AppSupabaseClient): Promise<CustomRolesOverview> {
  const { data, error } = await client.rpc('admin_custom_roles');
  if (error !== null) throw new CustomRoleError(customRoleFailureFrom(error));
  const parsed = overviewSchema.safeParse(data);
  if (!parsed.success) throw new CustomRoleError('unreachable');
  return toOverview(parsed.data);
}

/** A change to custom roles, as the page asks for it. */
export type CustomRoleChange =
  | {
      kind: 'save';
      roleId: string | null;
      name: string;
      description: string;
      areas: CustomRoleArea[];
      reason: string;
    }
  | { kind: 'remove'; roleId: string; reason: string }
  | { kind: 'set_holder'; roleId: string; userId: string; shouldHold: boolean; reason: string };

/**
 * Asks the database for one custom role change.
 *
 * @param client - the signed-in Supabase client
 * @param change - what to do
 * @throws CustomRoleError naming why it was refused
 */
export async function applyCustomRoleChange(
  client: AppSupabaseClient,
  change: CustomRoleChange,
): Promise<void> {
  let result;
  if (change.kind === 'save') {
    result = await client.rpc('admin_save_custom_role', {
      // A new role has no id yet; the database makes one.
      target_role_id: change.roleId as string,
      new_name: change.name,
      new_description: change.description,
      new_areas: change.areas.map((entry) => ({ area: entry.area, access: entry.access })),
      reason_given: change.reason,
    });
  } else if (change.kind === 'remove') {
    result = await client.rpc('admin_remove_custom_role', {
      target_role_id: change.roleId,
      reason_given: change.reason,
    });
  } else {
    result = await client.rpc('admin_set_custom_role_holder', {
      target_user_id: change.userId,
      target_role_id: change.roleId,
      should_hold: change.shouldHold,
      reason_given: change.reason,
    });
  }
  if (result.error !== null) throw new CustomRoleError(customRoleFailureFrom(result.error));
}
