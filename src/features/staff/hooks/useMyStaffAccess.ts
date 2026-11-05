/**
 * useMyStaffAccess: the areas, roles and username of the signed-in person, for the admin shell
 * (story S1-E11-01).
 *
 * Who calls it: StaffLayout, StaffHomePage and StaffFooter. What it calls: api/staffAccess.ts.
 * The answer is cached per person for a minute, so moving between staff pages doesn't ask again;
 * a refused action on any page can call refresh() to read it afresh.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchStaffAccess, type StaffAccess } from '../api/staffAccess';

/** The empty answer: a member, a visitor or an ended staff session. */
const noAccess: StaffAccess = {
  areas: [],
  roles: [],
  handle: null,
  workspace: { isNeeded: false, domain: null, isConnected: false },
};

/** The cache key for one person's access. */
const staffAccessKey = (userId: string | null) => ['staff-access', userId];

/**
 * Follows the person's staff access.
 *
 * @returns the access, whether it is known yet, whether someone is signed in, and refresh()
 */
export function useMyStaffAccess() {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const access = useQuery<StaffAccess>({
    queryKey: staffAccessKey(userId),
    enabled: userId !== null,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      // Without database settings there are no staff accounts.
      if (client === null || userId === null) return noAccess;
      return fetchStaffAccess(client, userId);
    },
  });

  return {
    access: access.data ?? noAccess,
    isKnown: isKnown && (userId === null || !access.isPending),
    isSignedIn: userId !== null,
    loadFailed: access.isError,
    refresh: () => queryClient.invalidateQueries({ queryKey: staffAccessKey(userId) }),
  };
}
