/**
 * useHomeComment and useHomeCommentInvitations: the reader comment on the home page's cover
 * wall, and the signed-in reader's own invitations with their answer (bundle GAPS-13).
 *
 * Who calls it: HomeCommentCard (the home page) and HubHomeCommentInvitations (the reader's
 * hub). What it calls: api/homeComment.ts, and useSession so the card waits until the app knows
 * who is looking (a block hides the card from that person only) and a visitor never asks for
 * invitations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import {
  answerHomeCommentPick,
  fetchHomeCommentCard,
  fetchHomeCommentInvitations,
  type HomeCommentCardData,
  type HomeCommentInvitation,
} from '../api/homeComment';

/** The first part of the cache key, shared so an answer or a staff change refreshes the card. */
export const homeCommentKey = ['home-comment'];
const invitationsKey = ['home-comment-invitations'];

/**
 * Follows the comment on the home page.
 *
 * @returns comment: the card, or null while loading, when there is none or when the read failed
 *   (the wall then shows without it, as it did before this bundle)
 */
export function useHomeComment(): { comment: HomeCommentCardData | null } {
  const { userId, isKnown } = useSession();
  const read = useQuery<HomeCommentCardData | null>({
    queryKey: [...homeCommentKey, userId],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchHomeCommentCard(client);
    },
  });
  return { comment: read.data ?? null };
}

/**
 * Follows the signed-in reader's own invitations and saves their answer.
 *
 * @returns invitations (empty for almost everyone), answer(id, agrees), isAnswering and
 *   answerFailed
 */
export function useHomeCommentInvitations(): {
  invitations: HomeCommentInvitation[];
  answer: (pickId: string, agrees: boolean) => void;
  isAnswering: boolean;
  answerFailed: boolean;
} {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const invitations = useQuery<HomeCommentInvitation[]>({
    queryKey: [...invitationsKey, userId],
    enabled: userId !== null,
    queryFn: async () => fetchHomeCommentInvitations(await requireClient()),
  });
  const saving = useMutation({
    mutationFn: async (given: { pickId: string; agrees: boolean }) =>
      answerHomeCommentPick(await requireClient(), given.pickId, given.agrees),
    // The invitation shows the new answer and the home page's card appears or goes at once.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invitationsKey });
      await queryClient.invalidateQueries({ queryKey: homeCommentKey });
    },
  });
  return {
    invitations: invitations.data ?? [],
    answer: (pickId, agrees) => saving.mutate({ pickId, agrees }),
    isAnswering: saving.isPending,
    answerFailed: saving.isError,
  };
}
