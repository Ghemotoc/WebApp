/**
 * The staff support hooks: the inbox with its filters, and one ticket with its fields, answers,
 * notes and the email (story S1-E11-13; bundle ADMIN-2h1).
 *
 * Who calls them: StaffSupportInboxPage and StaffSupportTicketPage. What they call:
 * api/staffSupportTickets.ts. After any change the staff tickets are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchStaffTicket,
  fetchSupportInbox,
  fetchSupportViewCounts,
  markTicketSpam,
  mergeTickets,
  replyAsSupport,
  revealTicketEmail,
  updateStaffTicket,
  type SupportInboxFilters,
  type TicketChanges,
} from '../api/staffSupportTickets';

import { supportFailureOf } from './useMySupport';

/**
 * The inbox: everything not yet solved or closed, to start with.
 *
 * @returns the filters, how to change them and the query
 */
export function useSupportInbox() {
  const [filters, setFilters] = useState<SupportInboxFilters>({ status: '', assigned: '' });
  const inbox = useQuery({
    queryKey: ['staff-support', 'inbox', filters],
    retry: false,
    queryFn: async () => fetchSupportInbox(await requireClient(), filters),
  });
  // The saved views' counts (part h3a); read again with the inbox.
  const counts = useQuery({
    queryKey: ['staff-support', 'view-counts', filters],
    retry: false,
    queryFn: async () => fetchSupportViewCounts(await requireClient()),
  });
  return { filters, setFilters, inbox, counts, ...supportFailureOf(inbox.error) };
}

/** One staff change to a ticket. */
export type StaffTicketChange =
  | { kind: 'fields'; changes: TicketChanges }
  | { kind: 'reply'; body: string; isNote: boolean }
  | { kind: 'spam'; spam: boolean }
  | { kind: 'merge'; into: number };

/**
 * Makes one change to a ticket.
 *
 * @returns nothing; throws a SupportError when refused
 */
async function applyChange(ticketNumber: number, change: StaffTicketChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'fields') return updateStaffTicket(client, ticketNumber, change.changes);
  if (change.kind === 'spam') return markTicketSpam(client, ticketNumber, change.spam);
  if (change.kind === 'merge') return mergeTickets(client, ticketNumber, change.into);
  return replyAsSupport(client, ticketNumber, change.body, change.isNote);
}

/**
 * One ticket for staff.
 *
 * @param ticketNumber - the number from the address
 * @returns the query, change(), the email once shown, and each call's state
 */
export function useStaffTicket(ticketNumber: number) {
  const queryClient = useQueryClient();
  const ticket = useQuery({
    queryKey: ['staff-support', 'ticket', ticketNumber],
    retry: false,
    queryFn: async () => fetchStaffTicket(await requireClient(), ticketNumber),
  });
  const change = useMutation({
    mutationFn: async (next: StaffTicketChange) => applyChange(ticketNumber, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-support'] }),
  });
  const reveal = useMutation({
    mutationFn: async () => revealTicketEmail(await requireClient(), ticketNumber),
  });
  return {
    ticket,
    change: (next: StaffTicketChange) => change.mutateAsync(next),
    isChanging: change.isPending,
    ...supportFailureOf(change.error),
    loadFailure: supportFailureOf(ticket.error).failure,
    revealEmail: () => reveal.mutate(),
    revealedEmail: reveal.data ?? null,
    revealFailed: reveal.isError,
  };
}
