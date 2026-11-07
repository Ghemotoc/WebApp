/**
 * Reads what the admin shell needs to know about the signed-in person (story S1-E11-01).
 *
 * Who calls it: hooks/useMyStaffAccess.ts.
 * What it calls next: my_staff_areas() (…_s1_e11_01_admin_shell.sql), which answers from the
 * roles table and the staff session, so it is empty for a member or once a staff session has
 * ended; the person's own staff_roles rows (policy staff_roles_select_own) and their own username
 * (policy profiles_select_own), for the name and role shown in the staff bar; and
 * my_staff_sign_in() (…_s1_e2_07b_workspace_sign_in.sql), which says when a staff member must
 * sign in with their Google Workspace account first (S1-E2-07b); and my_staff_session_ended()
 * (…_dash1_01_staff_dashboard.sql), which says when the 12-hour staff session has run out, so the
 * shell can ask the person to sign in again (DASH-1).
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One area the database allows, and how far. */
export interface StaffAreaAccess {
  area: string;
  access: 'view' | 'act';
}

/** Whether a staff member must sign in with Google Workspace before staff powers work. */
export interface StaffWorkspaceSignIn {
  /** True when the person holds a staff role but this session isn't a Workspace sign-in. */
  isNeeded: boolean;
  /** The staff domain, for example "example.com"; null when no Workspace sign-in is needed. */
  domain: string | null;
  /** True when the account is already linked to a Workspace account (then only sign in again). */
  isConnected: boolean;
}

/** What the shell knows about the signed-in person. */
export interface StaffAccess {
  /** The areas the server allows right now; empty for a member or an ended session. */
  areas: StaffAreaAccess[];
  /** The staff roles the person holds; empty for a member. */
  roles: Enums<'staff_role'>[];
  /** The person's username, for the staff bar; null before one is chosen. */
  handle: string | null;
  /** Whether staff powers wait for a Google Workspace sign-in (S1-E2-07b). */
  workspace: StaffWorkspaceSignIn;
  /** True when the person holds a staff role but their staff session is over 12 hours old (DASH-1). */
  sessionEnded: boolean;
}

/**
 * Reads my_staff_sign_in()'s answer.
 *
 * @param answer - the JSON the database returned
 * @returns the answer; anything unexpected counts as "not needed", because the server refuses
 *   staff actions on its own whatever the screen shows
 */
export function toWorkspaceSignIn(answer: unknown): StaffWorkspaceSignIn {
  const reply = (answer ?? {}) as {
    needs_workspace?: unknown;
    domain?: unknown;
    connected?: unknown;
  };
  const domain = typeof reply.domain === 'string' && reply.domain !== '' ? reply.domain : null;
  return {
    isNeeded: reply.needs_workspace === true && domain !== null,
    domain,
    isConnected: reply.connected === true,
  };
}

/**
 * Reads the person's areas, roles and username.
 *
 * @param client - the shared Supabase client
 * @param userId - the signed-in person's user ID (the roles and profile reads need it)
 * @returns the access; areas and roles are empty when the database refuses or finds nothing
 * Errors: throws when any read fails for a reason other than "nothing to see".
 */
export async function fetchStaffAccess(
  client: AppSupabaseClient,
  userId: string,
): Promise<StaffAccess> {
  // Step 1: the areas, from the one function the menu is built on.
  const areasResult = await client.rpc('my_staff_areas');
  if (areasResult.error !== null) throw new Error(areasResult.error.message);

  // Step 2: the person's own roles, for the label under their name.
  const rolesResult = await client.from('staff_roles').select('role').eq('user_id', userId);
  if (rolesResult.error !== null) throw new Error(rolesResult.error.message);

  // Step 3: whether staff powers wait for a Google Workspace sign-in (S1-E2-07b).
  const workspaceResult = await client.rpc('my_staff_sign_in');
  if (workspaceResult.error !== null) throw new Error(workspaceResult.error.message);

  // Step 4: whether the staff session has run out (12 hours, S1-E11-01), so the shell can say
  // "Sign in again" instead of showing an empty admin site (DASH-1).
  const endedResult = await client.rpc('my_staff_session_ended');
  if (endedResult.error !== null) throw new Error(endedResult.error.message);

  // Step 5: the username, for the staff bar.
  const profileResult = await client
    .from('profiles')
    .select('handle')
    .eq('id', userId)
    .maybeSingle();
  if (profileResult.error !== null) throw new Error(profileResult.error.message);

  return {
    areas: areasResult.data.map((row) => ({
      area: row.area,
      access: row.access === 'act' ? 'act' : 'view',
    })),
    roles: rolesResult.data.map((row) => row.role),
    handle: profileResult.data?.handle ?? null,
    workspace: toWorkspaceSignIn(workspaceResult.data),
    sessionEnded: endedResult.data === true,
  };
}
