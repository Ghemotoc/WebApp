/**
 * The member's moderator mail hooks: the list, one thread, writing and answering (story
 * S1-E10-11).
 *
 * Who calls them: MyMailPage, NewMailPage and MailThreadPage. What they call: api/moderatorMail.ts.
 * After a send or an answer the member's mail is read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchMyMail,
  fetchMyMailThread,
  MailError,
  replyAsMember,
  sendModeratorMail,
  type MailFailure,
} from '../api/moderatorMail';

/**
 * Why a mutation failed, and the minutes to wait for the hourly limit.
 *
 * @param error - the mutation's error, or null
 * @returns the failure and the minutes
 */
export function mailFailureOf(error: Error | null): {
  failure: MailFailure | null;
  waitMinutes: number | null;
} {
  if (error === null) return { failure: null, waitMinutes: null };
  if (error instanceof MailError) return { failure: error.failure, waitMinutes: error.waitMinutes };
  return { failure: 'unreachable', waitMinutes: null };
}

/**
 * The member's threads.
 *
 * @param isSignedIn - false for a visitor, so nothing is asked
 * @returns the query
 */
export function useMyMail(isSignedIn: boolean) {
  return useQuery({
    queryKey: ['my-moderator-mail'],
    enabled: isSignedIn,
    retry: false,
    queryFn: async () => fetchMyMail(await requireClient()),
  });
}

/**
 * One of the member's threads, and answering in it.
 *
 * @param reference - the thread's reference from the address
 * @returns the query, reply(body) and the reply's state
 */
export function useMyMailThread(reference: string) {
  const queryClient = useQueryClient();
  const thread = useQuery({
    queryKey: ['my-moderator-mail', reference],
    retry: false,
    queryFn: async () => fetchMyMailThread(await requireClient(), reference),
  });
  const reply = useMutation({
    mutationFn: async (body: string) => replyAsMember(await requireClient(), reference, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-moderator-mail'] }),
  });
  return {
    thread,
    reply: (body: string) => reply.mutateAsync(body),
    isReplying: reply.isPending,
    ...mailFailureOf(reply.error),
  };
}

/**
 * Writing a new message to the team.
 *
 * @returns send(message), the new reference, whether it is sending and why it failed
 */
export function useSendMail() {
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: async (message: {
      subject: string;
      body: string;
      statementReference: string | null;
    }) => sendModeratorMail(await requireClient(), message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-moderator-mail'] }),
  });
  return {
    send: (message: { subject: string; body: string; statementReference: string | null }) =>
      send.mutate(message),
    reference: send.data ?? null,
    isSending: send.isPending,
    ...mailFailureOf(send.error),
  };
}
