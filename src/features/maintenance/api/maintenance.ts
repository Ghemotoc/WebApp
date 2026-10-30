/**
 * Reads whether maintenance mode is on, and whether this session is a staff session
 * (story S1-E1-05).
 *
 * Who calls it: hooks/useMaintenanceMode.ts.
 * What it calls next:
 * - public.feature_flags, row maintenance_mode, through feature_flags_select_public (anyone may
 *   read public flags). The owner and admins switch it on Staff › Settings (S1-E11-03).
 * - public.is_staff_session(), the same check every staff rule uses (S1-E2-07a): true for a
 *   staff-role session in March, the Google Workspace check after S1-E2-07b.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Reads the maintenance_mode flag.
 *
 * @param client - the shared Supabase client
 * @returns true while maintenance mode is on
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMaintenanceMode(client: AppSupabaseClient): Promise<boolean> {
  const { data, error } = await client
    .from('feature_flags')
    .select('is_enabled')
    .eq('key', 'maintenance_mode')
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read maintenance mode: ${error.message}`);
  return data?.is_enabled ?? false;
}

/**
 * Asks the database whether this session may use staff powers.
 *
 * @param client - the shared Supabase client
 * @returns true for a staff session; false when signed out or not staff
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchIsStaffSession(client: AppSupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc('is_staff_session');
  if (error !== null) throw new Error(`Could not check for a staff session: ${error.message}`);
  return data;
}
