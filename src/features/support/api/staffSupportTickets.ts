/**
 * Support tickets for staff: the one inbox, a ticket with its notes and history, changing its
 * fields, answering, and showing the email (story S1-E11-13, part 13a; bundle ADMIN-2h1;
 * architecture 1.8.2: "Support tickets").
 *
 * Who calls it: hooks/useStaffSupport.ts (StaffSupportInboxPage, StaffSupportTicketPage).
 * What it calls next: admin_support_inbox(), admin_support_view_counts() (part h3a),
 * admin_support_ticket(), admin_update_support_ticket(),
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
  /** When the first answer is due (working days after it arrived, part h3a). */
  firstReplyDueAt: string;
  /** When staff first answered, or null. */
  firstRepliedAt: string | null;
}

/** The inbox's saved views (criterion 6); Spam comes with part h4. */
export type SupportViewName = 'mine' | 'unassigned' | 'all_open' | 'pending_on_user' | 'solved';

/** Each view as the filters it sets, in the order the inbox shows them. */
export const supportViews: { name: SupportViewName; filters: SupportInboxFilters }[] = [
  { name: 'mine', filters: { status: '', assigned: 'mine' } },
  { name: 'unassigned', filters: { status: '', assigned: 'nobody' } },
  { name: 'all_open', filters: { status: '', assigned: '' } },
  { name: 'pending_on_user', filters: { status: 'pending_on_user', assigned: '' } },
  { name: 'solved', filters: { status: 'solved', assigned: '' } },
];

/** How many tickets each view holds. */
export type SupportViewCounts = Record<SupportViewName, number>;

/** Whether a staff answer left by email (part h2); null for anything that isn't emailed. */
export type EmailState = 'sent' | 'waiting' | null;

/** One message as staff see it. */
export interface StaffTicketMessage {
  kind: TicketMessageKind;
  authorHandle: string | null;
  body: string;
  /** How it came in or went out: the app, Contact us or email. */
  channel: TicketChannel;
  emailed: EmailState;
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
  /** The closed ticket this one follows up (criterion 7), or null. */
  followUpOf: number | null;
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

/** Reads an answer's email state; anything unknown is "not emailed". */
function emailStateOf(value: Json | undefined): EmailState {
  if (value === 'sent' || value === 'waiting') return value;
  return null;
}

/** Reads one message. */
function messageFrom(message: Record<string, Json | undefined>): StaffTicketMessage {
  return {
    kind: (textOf(message, 'kind') ?? 'from_requester') as TicketMessageKind,
    authorHandle: textOf(message, 'author_handle'),
    body: textOf(message, 'body') ?? '',
    channel: (textOf(message, 'channel') ?? 'in_app') as TicketChannel,
    emailed: emailStateOf(message.emailed),
    at: textOf(message, 'at') ?? '',
  };
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
    followUpOf: typeof ticket.follow_up_of === 'number' ? ticket.follow_up_of : null,
    requester: requesterFrom(ticket.requester),
    messages: objectsOf(ticket.messages).map(messageFrom),
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
    firstReplyDueAt: row.first_reply_due_at,
    // The generated types say string, but it is empty until staff answer.
    firstRepliedAt: (row.first_replied_at as string | null) ?? null,
  }));
}

/**
 * The count of each saved view.
 *
 * @throws SupportError('not_allowed') for anyone without the support_tickets area
 */
export async function fetchSupportViewCounts(
  client: AppSupabaseClient,
): Promise<SupportViewCounts> {
  const { data, error } = await client.rpc('admin_support_view_counts');
  if (error !== null) throw supportErrorFrom(error);
  const counts = objectOf(data) ?? {};
  const countOf = (name: SupportViewName) => {
    const value = counts[name];
    return typeof value === 'number' ? value : 0;
  };
  return {
    mine: countOf('mine'),
    unassigned: countOf('unassigned'),
    all_open: countOf('all_open'),
    pending_on_user: countOf('pending_on_user'),
    solved: countOf('solved'),
  };
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
