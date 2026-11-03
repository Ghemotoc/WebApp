/**
 * The ticket links hook: what a ticket started (notices, data requests), and the two actions that
 * start them (story S1-E11-13, part 13b; bundle ADMIN-2h4b).
 *
 * Who calls it: TicketLinksPanel. What it calls: api/ticketLinks.ts. After either action the
 * ticket and its links are read again (its history gains a line).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  convertTicketToReport,
  fetchTicketLinks,
  openTicketDataRequest,
  type DataRequestType,
  type ReportDraft,
} from '../api/ticketLinks';

import { supportFailureOf } from './useMySupport';

/**
 * One ticket's links and actions.
 *
 * @param ticketNumber - the ticket's number
 * @returns the links query, convert and openRequest, and why the last one failed
 */
export function useTicketLinks(ticketNumber: number) {
  const queryClient = useQueryClient();
  const links = useQuery({
    queryKey: ['staff-support', 'ticket-links', ticketNumber],
    retry: false,
    queryFn: async () => fetchTicketLinks(await requireClient(), ticketNumber),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff-support'] });
  const convert = useMutation({
    mutationFn: async (draft: ReportDraft) =>
      convertTicketToReport(await requireClient(), ticketNumber, draft),
    onSuccess: refresh,
  });
  const openRequest = useMutation({
    mutationFn: async (requestType: DataRequestType) =>
      openTicketDataRequest(await requireClient(), ticketNumber, requestType),
    onSuccess: refresh,
  });
  return {
    links,
    convert,
    openRequest,
    convertFailure: supportFailureOf(convert.error).failure,
    requestFailure: supportFailureOf(openRequest.error).failure,
  };
}
