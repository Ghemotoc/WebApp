/**
 * useTagQueue: one view of the staff tag queue, and the two decisions: name (approve or rename)
 * and reject (CMS-1e).
 *
 * Who calls it: components/staff/TagsAdminPage.tsx.
 * What it calls: api/tagStore.ts. After a decision it reads the queue again and drops the cached
 * tag catalogue, so this browser shows the new names at once. The last failure keeps the
 * database's problems ("ro:taken") and the tag they belong to, so that row can name its fields.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { WebsiteContentError } from '@/features/website/api/websiteContentStore';

import {
  listQueuedTags,
  nameTag,
  rejectTag,
  type QueuedTag,
  type TagQueueView,
} from '../api/tagStore';

/** One decision on one tag. */
export type TagDecision =
  | { kind: 'name'; tagId: string; names: Record<string, string> }
  | { kind: 'reject'; tagId: string; reason: string };

/** What the queue screen gets. */
export interface TagQueue {
  tags: QueuedTag[];
  isLoading: boolean;
  loadFailure: WebsiteContentError | null;
  decide: (decision: TagDecision) => Promise<boolean>;
  isBusy: boolean;
  /** The last refusal and the tag it was about. */
  failure: { tagId: string; error: WebsiteContentError } | null;
  /** The last decision that went through: approved or rejected. */
  outcome: 'approved' | 'rejected' | null;
}

/**
 * Carries out one decision.
 *
 * @param decision - what to do
 */
async function runDecision(decision: TagDecision): Promise<void> {
  const client = await requireClient();
  if (decision.kind === 'name') await nameTag(client, decision.tagId, decision.names);
  else await rejectTag(client, decision.tagId, decision.reason);
}

/**
 * Turns anything thrown into the shared staff error.
 *
 * @param error - what was thrown
 * @returns a WebsiteContentError
 */
function asStaffError(error: unknown): WebsiteContentError {
  return error instanceof WebsiteContentError
    ? error
    : new WebsiteContentError('unreachable', String(error), [], null);
}

/**
 * The queue and its decisions.
 *
 * @param view - waiting tags, or approved tags missing a name
 * @returns the tags, their state and decide()
 */
export function useTagQueue(view: TagQueueView): TagQueue {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<TagQueue['failure']>(null);
  const [outcome, setOutcome] = useState<TagQueue['outcome']>(null);
  // Step 1: the view, as the moderation team may read it.
  const queue = useQuery({
    queryKey: ['tag-queue', view],
    queryFn: async () => listQueuedTags(await requireClient(), view),
  });
  // Step 2: one decision, then read again; a refusal is kept for its row.
  const mutation = useMutation({ mutationFn: runDecision });
  const decide = async (decision: TagDecision): Promise<boolean> => {
    setFailure(null);
    setOutcome(null);
    try {
      await mutation.mutateAsync(decision);
      setOutcome(decision.kind === 'name' ? 'approved' : 'rejected');
      return true;
    } catch (error) {
      setFailure({ tagId: decision.tagId, error: asStaffError(error) });
      return false;
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['tag-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['tag-catalogue'] });
    }
  };
  return {
    tags: queue.data ?? [],
    isLoading: queue.isLoading,
    loadFailure: queue.error === null ? null : asStaffError(queue.error),
    decide,
    isBusy: mutation.isPending,
    failure,
    outcome,
  };
}
