/**
 * Reads what the admin shell needs to know about the signed-in person (story S1-E11-01).
 *
 * Who calls it: hooks/useMyStaffAccess.ts.
 * What it calls next: my_staff_areas() (…_s1_e11_01_admin_shell.sql), which answers from the
 * roles table and the staff session, so it is empty for a member or once a staff session has
 * ended; the person's own staff_roles rows (policy staff_roles_select_own) and their own username
 * (policy profiles_select_own), for the name and role shown in the staff bar.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One area the database allows, and how far. */
export interface StaffAreaAccess {
  area: string;
  access: 'view' | 'act';
}

/** What the shell knows about the signed-in person. */
export interface StaffAccess {
  /** The areas the server allows right now; empty for a member or an ended session. */
  areas: StaffAreaAccess[];
  /** The staff roles the person holds; empty for a member. */
  roles: Enums<'staff_role'>[];
  /** The person's username, for the staff bar; null before one is chosen. */
  handle: string | null;
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

  // Step 3: the username, for the staff bar.
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
  };
}
