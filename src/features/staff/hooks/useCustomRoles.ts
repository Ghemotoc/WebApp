/**
 * useCustomRoles: the custom staff roles for the Roles page, and the one way to change them (story
 * S1-E11-33, bundle CMS-2a).
 *
 * Who calls it: CustomRolesSection. What it calls: api/customRoles.ts. After any change it reloads
 * the roles, and the staff list too, because a holder's access changed with it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import {
  applyCustomRoleChange,
  CustomRoleError,
  fetchCustomRoles,
  type CustomRoleChange,
  type CustomRoleFailure,
  type CustomRolesOverview,
} from '../api/customRoles';

/**
 * The Supabase client, or a failure the page can name when it isn't there.
 *
 * @returns the client
 * @throws CustomRoleError('unreachable') without one
 */
async function requireClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new CustomRoleError('unreachable');
  return client;
}

/**
 * Names what went wrong, or null when nothing did.
 *
 * @param hasFailed - whether the query or change failed
 * @param error - what it threw
 * @returns the failure name
 */
function failureOf(hasFailed: boolean, error: unknown): CustomRoleFailure | null {
  if (!hasFailed) return null;
  return error instanceof CustomRoleError ? error.failure : 'unreachable';
}

/** An empty overview while the roles load or when they can't be read. */
const noRoles: CustomRolesOverview = { roles: [], assignable: [] };

/**
 * Loads the custom roles and gives the page a way to change them.
 *
 * @returns the roles, the areas the person may give, and the state of the last change
 */
export function useCustomRoles() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const overview = useQuery<CustomRolesOverview>({
    queryKey: ['staff-custom-roles', userId],
    enabled: userId !== null,
    retry: false,
    queryFn: async () => fetchCustomRoles(await requireClient()),
  });
  const change = useMutation({
    mutationFn: async (roleChange: CustomRoleChange) =>
      applyCustomRoleChange(await requireClient(), roleChange),
    // Step: reload the roles and the staff list, whose access changed with them.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-custom-roles', userId] });
      await queryClient.invalidateQueries({ queryKey: ['staff-list', userId] });
    },
  });

  return {
    overview: overview.data ?? noRoles,
    isLoading: userId !== null && overview.isPending,
    loadFailure: failureOf(overview.isError, overview.error),
    change: (roleChange: CustomRoleChange) => change.mutateAsync(roleChange),
    isChanging: change.isPending,
    changeFailure: failureOf(change.isError, change.error),
    changeSucceeded: change.isSuccess,
    resetChange: change.reset,
  };
}
