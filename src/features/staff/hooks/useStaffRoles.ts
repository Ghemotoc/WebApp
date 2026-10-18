/**
 * useStaffRoles: the staff list, whether the signed-in person is an owner, and one way to change
 * a role or permission (story S1-E2-07a).
 *
 * Who calls it: StaffRolesPage. What it calls: api/staffRoles.ts. After each change the list is
 * read again, so the page always shows what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import {
  applyStaffChange,
  isOwner,
  listStaff,
  StaffChangeError,
  type StaffChange,
  type StaffChangeFailure,
  type StaffMember,
} from '../api/staffRoles';

/**
 * Gets the shared client, or fails in plain words when the app has no database settings.
 *
 * @returns the client
 */
async function requireClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new StaffChangeError('unreachable');
  return client;
}

/**
 * The reason a load or change failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a StaffChangeError
 */
function failureOf(hasFailed: boolean, error: unknown): StaffChangeFailure | null {
  if (!hasFailed) return null;
  return error instanceof StaffChangeError ? error.failure : 'unreachable';
}

/**
 * Follows the staff list.
 *
 * @returns staff, isOwner, the load and change states, and change()
 */
export function useStaffRoles() {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const staff = useQuery<StaffMember[]>({
    queryKey: ['staff-list', userId],
    enabled: userId !== null,
    retry: false,
    queryFn: async () => listStaff(await requireClient()),
  });
  const owner = useQuery<boolean>({
    queryKey: ['staff-is-owner', userId],
    enabled: userId !== null,
    queryFn: async () => (userId === null ? false : isOwner(await requireClient(), userId)),
  });
  const change = useMutation({
    mutationFn: async (staffChange: StaffChange) =>
      applyStaffChange(await requireClient(), staffChange),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-list', userId] }),
  });

  return {
    staff: staff.data ?? [],
    isOwner: owner.data ?? false,
    isLoading: !isKnown || (userId !== null && staff.isPending),
    isSignedIn: userId !== null,
    loadFailure: failureOf(staff.isError, staff.error),
    change: (staffChange: StaffChange) => change.mutateAsync(staffChange),
    isChanging: change.isPending,
    changeFailure: failureOf(change.isError, change.error),
    changeSucceeded: change.isSuccess,
  };
}
