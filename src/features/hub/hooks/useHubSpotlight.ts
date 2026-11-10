/**
 * useHubSpotlight and useMySpotlights: the writer of the week on the Writers' hub, and the
 * signed-in writer's own invitations with their answer (bundle GAPS-12e).
 *
 * Who calls it: HubSpotlight and HubSpotlightInvitations. What it calls: api/hubSpotlight.ts,
 * and useSession so a visitor who isn't signed in never asks the database.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  answerSpotlight,
  fetchHubSpotlight,
  fetchMySpotlights,
  type HubSpotlightCard,
  type SpotlightInvitation,
} from '../api/hubSpotlight';

/** The first part of the cache key, shared so an answer or a staff change refreshes the card. */
export const hubSpotlightKey = ['hub-spotlight'];
const mySpotlightsKey = ['hub-spotlight-invitations'];

/**
 * Follows this week's writer of the week.
 *
 * @returns spotlight (null while loading, signed out or when there is none) and loadFailed
 */
export function useHubSpotlight(): { spotlight: HubSpotlightCard | null; loadFailed: boolean } {
  const { userId } = useSession();
  // One cache entry per person, because a block hides the card from that person only.
  const spotlight = useQuery<HubSpotlightCard | null>({
    queryKey: [...hubSpotlightKey, userId],
    enabled: userId !== null,
    queryFn: async () => fetchHubSpotlight(await requireClient()),
  });
  return { spotlight: spotlight.data ?? null, loadFailed: spotlight.isError };
}

/**
 * Follows the signed-in writer's own invitations and saves their answer.
 *
 * @returns invitations (empty for almost everyone), answer(id, agrees), isAnswering and
 *   answerFailed
 */
export function useMySpotlights(): {
  invitations: SpotlightInvitation[];
  answer: (spotlightId: string, agrees: boolean) => void;
  isAnswering: boolean;
  answerFailed: boolean;
} {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const invitations = useQuery<SpotlightInvitation[]>({
    queryKey: [...mySpotlightsKey, userId],
    enabled: userId !== null,
    queryFn: async () => fetchMySpotlights(await requireClient()),
  });
  const saving = useMutation({
    mutationFn: async (given: { spotlightId: string; agrees: boolean }) =>
      answerSpotlight(await requireClient(), given.spotlightId, given.agrees),
    // The invitation shows the new answer and the hub's card appears or goes at once.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mySpotlightsKey });
      await queryClient.invalidateQueries({ queryKey: hubSpotlightKey });
    },
  });
  return {
    invitations: invitations.data ?? [],
    answer: (spotlightId, agrees) => saving.mutate({ spotlightId, agrees }),
    isAnswering: saving.isPending,
    answerFailed: saving.isError,
  };
}
