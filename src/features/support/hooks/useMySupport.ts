/**
 * The member's support hooks: their tickets, one ticket, asking for help and answering (story
 * S1-E11-13; bundle ADMIN-2h1).
 *
 * Who calls them: MySupportPage, NewSupportRequestPage, MySupportTicketPage and
 * SupportRequestsSection. What they call: api/supportTickets.ts. After a new request or an answer
 * the member's tickets are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  createMyTicket,
  fetchMyTicket,
  fetchMyTickets,
  replyToMyTicket,
  SupportError,
  type SupportFailure,
  type TicketCategory,
} from '../api/supportTickets';

/** What a member's new request holds. */
export interface NewSupportRequest {
  subject: string;
  body: string;
  category: TicketCategory;
}

/**
 * Why a call failed, and the minutes to wait for the hourly limit.
 *
 * @param error - the query's or mutation's error, or null
 * @returns the failure and the minutes
 */
export function supportFailureOf(error: Error | null): {
  failure: SupportFailure | null;
  waitMinutes: number | null;
} {
  if (error === null) return { failure: null, waitMinutes: null };
  if (error instanceof SupportError)
    return { failure: error.failure, waitMinutes: error.waitMinutes };
  return { failure: 'unreachable', waitMinutes: null };
}

/**
 * The member's tickets.
 *
 * @param isSignedIn - false for a visitor, so nothing is asked
 * @returns the query
 */
export function useMyTickets(isSignedIn: boolean) {
  return useQuery({
    queryKey: ['my-support-tickets'],
    enabled: isSignedIn,
    retry: false,
    queryFn: async () => fetchMyTickets(await requireClient()),
  });
}

/**
 * One of the member's tickets, and answering in it.
 *
 * @param ticketNumber - the number from the address
 * @returns the query, reply(body) and the reply's state
 */
export function useMyTicket(ticketNumber: number) {
  const queryClient = useQueryClient();
  const ticket = useQuery({
    queryKey: ['my-support-tickets', ticketNumber],
    retry: false,
    queryFn: async () => fetchMyTicket(await requireClient(), ticketNumber),
  });
  const reply = useMutation({
    mutationFn: async (body: string) => replyToMyTicket(await requireClient(), ticketNumber, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] }),
  });
  return {
    ticket,
    reply: (body: string) => reply.mutateAsync(body),
    isReplying: reply.isPending,
    ...supportFailureOf(reply.error),
  };
}

/**
 * Asking for help.
 *
 * @returns send(request), the new number, whether it is sending and why it failed
 */
export function useNewSupportRequest() {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: async (request: NewSupportRequest) =>
      createMyTicket(await requireClient(), request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] }),
  });
  return {
    send: (request: NewSupportRequest) => create.mutate(request),
    ticketNumber: create.data ?? null,
    isSending: create.isPending,
    ...supportFailureOf(create.error),
  };
}
