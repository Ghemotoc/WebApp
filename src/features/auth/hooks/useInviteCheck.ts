/**
 * useInviteCheck: whether the invite code in the address still works (story S1-E2-01).
 *
 * Who calls it: SignUpPage, for /join/<code> while invite_only is on.
 * What it calls: api/invites.ts → check_invite(code). No code, no question.
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

import { checkInvite, type InviteStatus } from '../api/invites';

/**
 * Checks a code.
 *
 * @param code - the code from the address, or null when there is none
 * @returns TanStack Query's result: data is 'valid', 'ended' or 'unknown'
 */
export function useInviteCheck(code: string | null) {
  return useQuery<InviteStatus>({
    queryKey: ['invite-check', code],
    enabled: code !== null,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || code === null)
        throw new Error('The app is not connected to its database.');
      return checkInvite(client, code);
    },
  });
}
