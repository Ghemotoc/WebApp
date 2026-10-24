/**
 * requireStaffClient: the shared Supabase client for the user management hooks (story S1-E11-02),
 * or a plain "unreachable" failure when the app has no database settings.
 *
 * Who calls it: useUserLookup, useAccount and useAccountActions.
 */
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import { UserManagementError } from '../api/userManagement';

/**
 * Gets the client.
 *
 * @returns the client
 * Errors: throws UserManagementError('unreachable') without database settings.
 */
export async function requireStaffClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new UserManagementError('unreachable');
  return client;
}
