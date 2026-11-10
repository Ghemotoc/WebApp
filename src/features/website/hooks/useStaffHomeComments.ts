/**
 * useStaffHomeComments: the staff side of the home page comment: the comments that could be
 * invited, the picks with each reader's answer, inviting and taking down (bundle GAPS-13).
 *
 * Who calls it: HomeCommentSection on the Featured page. What it calls: api/homeComment.ts.
 * After a change both lists and the home page's own card are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  deleteHomeCommentPick,
  fetchHomeCommentCandidates,
  fetchStaffHomeCommentPicks,
  HomeCommentStaffError,
  inviteHomeComment,
  type HomeCommentStaffFailure,
} from '../api/homeComment';

import { homeCommentKey } from './useHomeComment';

const staffHomeCommentsKey = ['staff-home-comments'];

/**
 * The screen's reason for an error from a staff call.
 *
 * @param error - what the query or mutation holds
 * @returns null without an error, the error's own reason, or "failed" for anything unexpected
 */
function failureOf(error: unknown): HomeCommentStaffFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof HomeCommentStaffError ? error.failure : 'failed';
}

/**
 * The lists and how to change them.
 *
 * @returns candidates and picks (null while loading), invite(commentId), remove(pickId),
 *   isChanging, loadFailure and changeFailure
 */
export function useStaffHomeComments() {
  const queryClient = useQueryClient();
  const candidates = useQuery({
    queryKey: [...staffHomeCommentsKey, 'candidates'],
    retry: false,
    queryFn: async () => fetchHomeCommentCandidates(await requireClient()),
  });
  const picks = useQuery({
    queryKey: [...staffHomeCommentsKey, 'picks'],
    retry: false,
    queryFn: async () => fetchStaffHomeCommentPicks(await requireClient()),
  });
  // A failed change also re-reads the lists: the usual cause is a comment that just went away.
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: staffHomeCommentsKey });
    await queryClient.invalidateQueries({ queryKey: homeCommentKey });
  };
  const invite = useMutation({
    mutationFn: async (commentId: string) => inviteHomeComment(await requireClient(), commentId),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (pickId: string) => deleteHomeCommentPick(await requireClient(), pickId),
    onSettled: refresh,
  });
  return {
    candidates: candidates.data ?? null,
    picks: picks.data ?? null,
    invite: (commentId: string) => invite.mutate(commentId),
    remove: (pickId: string) => remove.mutate(pickId),
    isChanging: invite.isPending || remove.isPending,
    loadFailure: failureOf(candidates.error ?? picks.error),
    changeFailure: failureOf(invite.error ?? remove.error),
  };
}
