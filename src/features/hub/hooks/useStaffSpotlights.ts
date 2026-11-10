/**
 * useStaffSpotlights: the staff page's writer-of-the-week picks: the list, inviting and deleting
 * (bundle GAPS-12e).
 *
 * Who calls it: SpotlightsSection. What it calls: api/hubSpotlight.ts. After a change the staff
 * list and the hub's own card are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  deleteSpotlight,
  fetchStaffSpotlights,
  inviteSpotlight,
  type SpotlightDraft,
} from '../api/hubSpotlight';
import { hubStaffFailureOf } from '../api/hubStaffErrors';

import { hubSpotlightKey } from './useHubSpotlight';

const staffSpotlightsKey = ['staff-hub', 'spotlights'];

/**
 * The picks and how to change them.
 *
 * @returns the query, invite and remove, whether a change is running and why the last one failed
 */
export function useStaffSpotlights() {
  const queryClient = useQueryClient();
  const spotlights = useQuery({
    queryKey: staffSpotlightsKey,
    retry: false,
    queryFn: async () => fetchStaffSpotlights(await requireClient()),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: staffSpotlightsKey });
    await queryClient.invalidateQueries({ queryKey: hubSpotlightKey });
  };
  const invite = useMutation({
    mutationFn: async (draft: SpotlightDraft) => inviteSpotlight(await requireClient(), draft),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (spotlightId: string) => deleteSpotlight(await requireClient(), spotlightId),
    onSuccess: refresh,
  });
  return {
    spotlights,
    invite,
    remove,
    isChanging: invite.isPending || remove.isPending,
    changeFailure: hubStaffFailureOf(invite.error ?? remove.error),
  };
}
