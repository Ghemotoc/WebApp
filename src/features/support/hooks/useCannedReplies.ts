/**
 * The canned replies hook: the list, saving and deleting (story S1-E11-13, part 13b; bundle
 * ADMIN-2h3b).
 *
 * Who calls it: CannedRepliesPage and CannedReplyPicker. What it calls: api/cannedReplies.ts.
 * After a save or a delete the list is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  deleteCannedReply,
  fetchCannedReplies,
  saveCannedReply,
  type CannedReplyDraft,
} from '../api/cannedReplies';

import { supportFailureOf } from './useMySupport';

const cannedRepliesKey = ['staff-support', 'canned-replies'];

/**
 * The canned replies and how to change them.
 *
 * @returns the query, save and remove, and the failure of the last change or the load
 */
export function useCannedReplies() {
  const queryClient = useQueryClient();
  const replies = useQuery({
    queryKey: cannedRepliesKey,
    retry: false,
    queryFn: async () => fetchCannedReplies(await requireClient()),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: cannedRepliesKey });
  const save = useMutation({
    mutationFn: async (draft: CannedReplyDraft) => saveCannedReply(await requireClient(), draft),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (replyId: string) => deleteCannedReply(await requireClient(), replyId),
    onSuccess: refresh,
  });
  return {
    replies,
    save,
    remove,
    isChanging: save.isPending || remove.isPending,
    loadFailure: supportFailureOf(replies.error).failure,
    changeFailure: supportFailureOf(save.error ?? remove.error).failure,
  };
}
