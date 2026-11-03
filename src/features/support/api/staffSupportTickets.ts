/**
 * Support tickets for staff: the one inbox, a ticket with its notes and history, changing its
 * fields, answering, and showing the email (story S1-E11-13, part 13a; bundle ADMIN-2h1;
 * architecture 1.8.2: "Support tickets").
 *
 * Who calls it: hooks/useStaffSupport.ts (StaffSupportInboxPage, StaffSupportTicketPage).
 * What it calls next: admin_support_inbox(), admin_support_ticket(), admin_update_support_ticket(),
 * admin_reply_support_ticket() and admin_reveal_ticket_email(). Each checks the caller holds the
 * support_tickets area (owner, admin and support) and writes the audit log, never the words.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  categoryOf,
  objectOf,
  statusOf,
  supportErrorFrom,
  textOf,
  type TicketCategory,
  type TicketStatus,
} from './supportTickets';

/** How urgent a ticket is. */
export type TicketPriority = Enums<'support_ticket_priority'>;
/** How a ticket arrived. */
export type TicketChannel = Enums<'support_ticket_channel'>;
/** Who wrote one message. */
export type TicketMessageKind = Enums<'support_message_kind'>;
/** The age group the person's panel shows (never the year of birth, criterion 12). */
export type AgeGroup = Enums<'age_band'>;

/** Every priority, lowest first. */
export const ticketPriorities: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

/** What the inbox can be narrowed by: a status, "all", or empty for everything not finished. */
export interface SupportInboxFilters {
  status: TicketStatus | 'all' | '';
  assigned: 'mine' | 'nobody' | '';
}

/** One ticket in the inbox. */
export interface StaffTicketSummary {
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  channel: TicketChannel;
  requesterHandle: string | null;
  emailOnly: boolean;
  assignedHandle: string | null;
  assignedToMe: boolean;
  messageCount: number;
  lastMessageAt: string;
}

/** One message as staff see it. */
export interface StaffTicketMessage {
  kind: TicketMessageKind;
  authorHandle: string | null;
  body: string;
  at: string;
}

/** One line of a ticket's history. */
export interface TicketHistoryEntry {
  change: string;
  before: Json | null;
  after: Json | null;
  actorHandle: string | null;
  at: string;
}

/** The person asking, as the panel shows them. */
export interface TicketRequester {
  handle: string | null;
  /** Staff may see the user ID (architecture 1.6); empty for an email-only ticket. */
  userId: string | null;
  emailOnly: boolean;
  maskedEmail: string | null;
  ageGroup: AgeGroup | null;
}

/** One ticket with everything staff see. */
export interface StaffTicket {
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  channel: TicketChannel;
  tags: string[];
  assignedHandle: string | null;
  requester: TicketRequester;
  messages: StaffTicketMessage[];
  history: TicketHistoryEntry[];
}

/** The fields staff can change; a missing key stays as it is. */
export interface TicketChanges {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  /** A username, or "" for nobody. */
  assignee?: string;
  tags?: string[];
}

/** The objects of a JSON array, skipping anything else. */
function objectsOf(value: Json | undefined): Record<string, Json | undefined>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = objectOf(entry);
    return record === null ? [] : [record];
  });
}

/** Reads the person's panel. */
function requesterFrom(value: Json | undefined): TicketRequester {
  const requester = objectOf(value) ?? {};
  return {
    handle: textOf(requester, 'handle'),
    userId: textOf(requester, 'user_id'),
    emailOnly: requester.email_only === true,
    maskedEmail: textOf(requester, 'masked_email'),
    ageGroup: textOf(requester, 'age_group') as AgeGroup | null,
  };
}

/**
 * Reads the staff ticket JSON.
 *
 * @param json - as admin_support_ticket() returns it
 * @returns the ticket, or null for an unknown number
 */
export function staffTicketFromJson(json: Json | null): StaffTicket | null {
  const ticket = objectOf(json ?? undefined);
  if (ticket === null) return null;
  return {
    number: typeof ticket.number === 'number' ? ticket.number : 0,
    subject: textOf(ticket, 'subject') ?? '',
    status: statusOf(ticket.status),
    priority: (textOf(ticket, 'priority') ?? 'normal') as TicketPriority,
    category: categoryOf(ticket.category),
    channel: (textOf(ticket, 'channel') ?? 'in_app') as TicketChannel,
    tags: Array.isArray(ticket.tags) ? ticket.tags.filter((tag) => typeof tag === 'string') : [],
    assignedHandle: textOf(ticket, 'assigned_handle'),
    requester: requesterFrom(ticket.requester),
    messages: objectsOf(ticket.messages).map((message) => ({
      kind: (textOf(message, 'kind') ?? 'from_requester') as TicketMessageKind,
      authorHandle: textOf(message, 'author_handle'),
      body: textOf(message, 'body') ?? '',
      at: textOf(message, 'at') ?? '',
    })),
    history: objectsOf(ticket.history).map((entry) => ({
      change: textOf(entry, 'change') ?? '',
      before: entry.before ?? null,
      after: entry.after ?? null,
      actorHandle: textOf(entry, 'actor_handle'),
      at: textOf(entry, 'at') ?? '',
    })),
  };
}

/**
 * The inbox, most urgent and longest waiting first.
 *
 * @throws SupportError('not_allowed') for anyone without the support_tickets area
 */
export async function fetchSupportInbox(
  client: AppSupabaseClient,
  filters: SupportInboxFilters,
): Promise<StaffTicketSummary[]> {
  const { data, error } = await client.rpc('admin_support_inbox', {
    status_filter: filters.status === '' ? undefined : filters.status,
    assigned_filter: filters.assigned === '' ? undefined : filters.assigned,
  });
  if (error !== null) throw supportErrorFrom(error);
  return data.map((row) => ({
    number: row.number,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    category: row.category,
    channel: row.channel,
    // The generated types say string, but both are empty for an email-only or unassigned ticket.
    requesterHandle: (row.requester_handle as string | null) ?? null,
    emailOnly: row.email_only,
    assignedHandle: (row.assigned_handle as string | null) ?? null,
    assignedToMe: row.assigned_to_me,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  }));
}

/**
 * One ticket with every message, note and history line; opening it is logged.
 *
 * @throws SupportError
 */
export async function fetchStaffTicket(
  client: AppSupabaseClient,
  ticketNumber: number,
): Promise<StaffTicket | null> {
  const { data, error } = await client.rpc('admin_support_ticket', { ticket_number: ticketNumber });
  if (error !== null) throw supportErrorFrom(error);
  return staffTicketFromJson(data);
}

/**
 * Changes the given fields; each change goes into the history and the audit log.
 *
 * @throws SupportError('refused') for an assignee who can't answer tickets or a bad tag
 */
export async function updateStaffTicket(
  client: AppSupabaseClient,
  ticketNumber: number,
  changes: TicketChanges,
): Promise<void> {
  const { error } = await client.rpc('admin_update_support_ticket', {
    ticket_number: ticketNumber,
    changes: changes as Json,
  });
  if (error !== null) throw supportErrorFrom(error);
}

/**
 * Answers the person, or adds an internal note only staff see.
 *
 * @throws SupportError('refused') for an empty answer or a reply on a closed ticket
 */
export async function replyAsSupport(
  client: AppSupabaseClient,
  ticketNumber: number,
  body: string,
  isNote: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_reply_support_ticket', {
    ticket_number: ticketNumber,
    body,
    is_note: isNote,
  });
  if (error !== null) throw supportErrorFrom(error);
}

/**
 * The address the ticket answers to; showing it is logged.
 *
 * @throws SupportError
 */
export async function revealTicketEmail(
  client: AppSupabaseClient,
  ticketNumber: number,
): Promise<string> {
  const { data, error } = await client.rpc('admin_reveal_ticket_email', {
    ticket_number: ticketNumber,
  });
  if (error !== null) throw supportErrorFrom(error);
  return data;
}
