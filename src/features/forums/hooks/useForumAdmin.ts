/**
 * useForumAdmin: the staff forum page's list and its two actions, save and remove (bundle
 * FORUMS-1, part a; S1-E8-01, first criterion).
 *
 * Who calls it: components/staff/ForumsAdminPage.tsx. What it calls: api/forumAdmin.ts. After an
 * action it reads the list again and drops the cached forum index, so this browser shows the
 * change at once. The last refusal keeps the database's fields to fix ("ro:empty") and the form
 * it belongs to ("new" or the forum's id), so that form can name its fields.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { WebsiteContentError } from '@/features/website/api/websiteContentStore';

import {
  listStaffForums,
  removeForum,
  saveForum,
  type ForumChanges,
  type StaffForum,
} from '../api/forumAdmin';

import { forumsQueryKey } from './useForumIndex';

/** One staff action. */
export type ForumAction =
  { kind: 'save'; changes: ForumChanges } | { kind: 'remove'; forumId: string; reason: string };

/** What the page gets. */
export interface ForumAdmin {
  forums: StaffForum[];
  isLoading: boolean;
  loadFailure: WebsiteContentError | null;
  act: (action: ForumAction) => Promise<boolean>;
  isBusy: boolean;
  /** The last refusal and the form it was about: "new" or the forum's id. */
  failure: { formKey: string; error: WebsiteContentError } | null;
  /** The last action that went through. */
  outcome: 'saved' | 'removed' | null;
}

/**
 * The form an action belongs to.
 *
 * @param action - the action
 * @returns "new" for a forum being added, otherwise the forum's id
 */
export function formKeyOf(action: ForumAction): string {
  if (action.kind === 'remove') return action.forumId;
  return action.changes.forumId ?? 'new';
}

/**
 * Carries out one action.
 *
 * @param action - what to do
 */
async function runAction(action: ForumAction): Promise<void> {
  const client = await requireClient();
  if (action.kind === 'save') await saveForum(client, action.changes);
  else await removeForum(client, action.forumId, action.reason);
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
 * The forums and the actions on them.
 *
 * @returns the list, its state and act()
 */
export function useForumAdmin(): ForumAdmin {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<ForumAdmin['failure']>(null);
  const [outcome, setOutcome] = useState<ForumAdmin['outcome']>(null);
  // Step 1: every live forum, as the owner and admins may read them.
  const list = useQuery({
    queryKey: [forumsQueryKey, 'staff'],
    queryFn: async () => listStaffForums(await requireClient()),
  });
  // Step 2: one action, then read again; a refusal is kept for its form.
  const mutation = useMutation({ mutationFn: runAction });
  const act = async (action: ForumAction): Promise<boolean> => {
    setFailure(null);
    setOutcome(null);
    try {
      await mutation.mutateAsync(action);
      setOutcome(action.kind === 'save' ? 'saved' : 'removed');
      return true;
    } catch (error) {
      setFailure({ formKey: formKeyOf(action), error: asStaffError(error) });
      return false;
    } finally {
      await queryClient.invalidateQueries({ queryKey: [forumsQueryKey] });
    }
  };
  return {
    forums: list.data ?? [],
    isLoading: list.isLoading,
    loadFailure: list.error === null ? null : asStaffError(list.error),
    act,
    isBusy: mutation.isPending,
    failure,
    outcome,
  };
}
