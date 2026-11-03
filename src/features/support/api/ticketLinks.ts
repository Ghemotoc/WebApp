/**
 * From a support ticket to the moderation team and to data requests: Convert to report, Open
 * data request, and the notices and requests a ticket started (story S1-E11-13, part 13b; bundle
 * ADMIN-2h4b; criteria 10 and 11).
 *
 * Who calls it: hooks/useTicketLinks.ts (TicketLinksPanel). What it calls next:
 * admin_convert_ticket_to_report(), admin_open_ticket_data_request() and admin_ticket_links(),
 * which check the caller's areas and write the audit log.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { objectOf, supportErrorFrom, textOf } from './supportTickets';

/** Why something is reported; its tier and safeguarding follow from it. */
export type ReportReason = Enums<'report_reason'>;
/** What a data request asks for. */
export type DataRequestType = Enums<'data_request_type'>;

/** The reasons staff pick from when converting a ticket (the content ones, not spam or AI). */
export const ticketReportReasons: ReportReason[] = [
  'threat_to_minor',
  'child_sexual_content',
  'self_harm',
  'terrorism',
  'illegal_content',
  'harassment',
  'hate',
  'copyright',
  'other',
];

/** What a data request can ask for. */
export const dataRequestTypes: DataRequestType[] = ['copy', 'move', 'correct', 'delete', 'other'];

/** What staff fill in to convert a ticket. */
export interface ReportDraft {
  /** The address of what is reported, or "" when there is none. */
  address: string;
  reason: ReportReason;
  explanation: string;
}

/** The notices and data requests started from one ticket. */
export interface TicketLinks {
  notices: { reference: string; at: string }[];
  dataRequests: { id: string; reference: string; type: DataRequestType; dueOn: string }[];
}

/** The objects of a JSON array, skipping anything else. */
function recordsOf(value: Json | undefined): Record<string, Json | undefined>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = objectOf(entry);
    return record === null ? [] : [record];
  });
}

/**
 * The notices and data requests started from a ticket, newest first.
 *
 * @throws SupportError
 */
export async function fetchTicketLinks(
  client: AppSupabaseClient,
  ticketNumber: number,
): Promise<TicketLinks> {
  const { data, error } = await client.rpc('admin_ticket_links', { ticket_number: ticketNumber });
  if (error !== null) throw supportErrorFrom(error);
  const links = objectOf(data) ?? {};
  return {
    notices: recordsOf(links.notices).map((notice) => ({
      reference: textOf(notice, 'reference') ?? '',
      at: textOf(notice, 'at') ?? '',
    })),
    dataRequests: recordsOf(links.data_requests).map((request) => ({
      id: textOf(request, 'id') ?? '',
      reference: textOf(request, 'reference') ?? '',
      type: (textOf(request, 'type') ?? 'other') as DataRequestType,
      dueOn: textOf(request, 'due_on') ?? '',
    })),
  };
}

/**
 * Turns the ticket into a notice for the moderation team.
 *
 * @returns the notice's reference and whether it reached the queue as a case
 * @throws SupportError('refused') for an empty explanation or a spam ticket
 */
export async function convertTicketToReport(
  client: AppSupabaseClient,
  ticketNumber: number,
  draft: ReportDraft,
): Promise<{ reference: string; matched: boolean }> {
  const { data, error } = await client.rpc('admin_convert_ticket_to_report', {
    ticket_number: ticketNumber,
    content_address: draft.address,
    reason: draft.reason,
    explanation: draft.explanation,
  });
  if (error !== null) throw supportErrorFrom(error);
  const result = objectOf(data) ?? {};
  return { reference: textOf(result, 'reference') ?? '', matched: result.matched === true };
}

/**
 * Starts a data request for the ticket's account, received on the day the ticket arrived.
 *
 * @returns the request's reference
 * @throws SupportError('refused') for a ticket without an account, ('not_allowed') for staff
 *   without the data requests area
 */
export async function openTicketDataRequest(
  client: AppSupabaseClient,
  ticketNumber: number,
  requestType: DataRequestType,
): Promise<string> {
  const { data, error } = await client.rpc('admin_open_ticket_data_request', {
    ticket_number: ticketNumber,
    request_type: requestType,
  });
  if (error !== null) throw supportErrorFrom(error);
  return textOf(objectOf(data) ?? {}, 'reference') ?? '';
}
