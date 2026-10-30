/**
 * The staff moderator mail hooks: the inbox with its filters, and one thread with assigning,
 * answering, notes and the status (story S1-E10-11).
 *
 * Who calls them: StaffMailInboxPage and StaffMailThreadPage. What they call:
 * api/staffModeratorMail.ts. After any change the staff mail is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import type { MailStatus } from '../api/moderatorMail';
import {
  assignThread,
  fetchInbox,
  fetchStaffThread,
  replyAsTeam,
  setThreadStatus,
  type InboxFilters,
} from '../api/staffModeratorMail';

import { mailFailureOf } from './useMyMail';

/**
 * The shared inbox.
 *
 * @returns the filters, how to change them and the query
 */
export function useStaffInbox() {
  const [filters, setFilters] = useState<InboxFilters>({ status: 'open', assigned: '' });
  const inbox = useQuery({
    queryKey: ['staff-moderator-mail', 'inbox', filters],
    retry: false,
    queryFn: async () => fetchInbox(await requireClient(), filters),
  });
  return { filters, setFilters, inbox, ...mailFailureOf(inbox.error) };
}

/** One staff change to a thread. */
type ThreadChange =
  | { kind: 'assign'; handle: string }
  | { kind: 'reply'; body: string; isNote: boolean }
  | { kind: 'status'; status: MailStatus };

/**
 * Makes one change to a thread.
 *
 * @returns nothing; throws a MailError when refused
 */
async function applyChange(reference: string, change: ThreadChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'assign') return assignThread(client, reference, change.handle);
  if (change.kind === 'reply') return replyAsTeam(client, reference, change.body, change.isNote);
  return setThreadStatus(client, reference, change.status);
}

/**
 * One thread for staff.
 *
 * @param reference - the thread's reference from the address
 * @returns the query, change() and the change's state
 */
export function useStaffThread(reference: string) {
  const queryClient = useQueryClient();
  const thread = useQuery({
    queryKey: ['staff-moderator-mail', 'thread', reference],
    retry: false,
    queryFn: async () => fetchStaffThread(await requireClient(), reference),
  });
  const change = useMutation({
    mutationFn: async (next: ThreadChange) => applyChange(reference, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-moderator-mail'] }),
  });
  return {
    thread,
    change: (next: ThreadChange) => change.mutateAsync(next),
    isChanging: change.isPending,
    ...mailFailureOf(change.error),
    loadFailure: mailFailureOf(thread.error).failure,
  };
}
