/**
 * Support tickets for members: "Support requests" in Settings, asking for help and answering
 * the support team (story S1-E11-13, part 13a; bundle ADMIN-2h1).
 *
 * Who calls it: hooks/useMySupport.ts (the /support pages and the Settings card).
 * What it calls next: create_my_support_ticket(), reply_my_support_ticket(), my_support_tickets()
 * and my_support_ticket() (…_admin2_h1_support_tickets.sql). Members never see internal notes or
 * which person on the team answered; the database leaves both out.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Where a ticket is in its life, as the database names it. */
export type TicketStatus = Enums<'support_ticket_status'>;
/** What a ticket is about. */
export type TicketCategory = Enums<'support_ticket_category'>;

/** Every status, in the order a ticket usually goes through them. */
export const ticketStatuses: TicketStatus[] = [
  'new',
  'open',
  'pending_on_user',
  'on_hold',
  'solved',
  'closed',
];

/** Every category, in the order the form lists them. */
export const ticketCategories: TicketCategory[] = [
  'account',
  'writing',
  'reading',
  'safety_question',
  'school_or_university',
  'bug',
  'other',
];

/** The longest subject and message the database takes. */
export const supportLimits = { subject: 150, body: 4000 } as const;

/** One of the member's tickets in their list. */
export interface MyTicketSummary {
  number: number;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  lastMessageAt: string;
  /** True when the team answered last, so the list can say "We answered". */
  teamRepliedLast: boolean;
}

/** One message as the member sees it. */
export interface MyTicketMessage {
  fromTeam: boolean;
  body: string;
  at: string;
}

/** One of the member's tickets with its messages. */
export interface MyTicket {
  number: number;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  /** After staff merged it: the request the messages live in now (part h4a), or null. */
  mergedInto: number | null;
  messages: MyTicketMessage[];
}

/** Why a call didn't work. */
export type SupportFailure = 'refused' | 'too_many' | 'not_found' | 'not_allowed' | 'unreachable';

/** The error a refused call throws; waitMinutes is set for too_many. */
export class SupportError extends Error {
  constructor(
    public readonly failure: SupportFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Support ticket call failed: ${failure}`);
  }
}

/**
 * Turns a database error into a SupportError.
 *
 * @param error - Postgres's code and hint
 * @returns the error to throw
 */
export function supportErrorFrom(error: { code: string; hint?: string | null }): SupportError {
  if (error.code === '54000') {
    const minutes = /wait_minutes:(\d+)/.exec(error.hint ?? '')?.[1];
    return new SupportError('too_many', minutes === undefined ? null : Number(minutes));
  }
  if (error.code === '23514') return new SupportError('refused');
  if (error.code === 'P0002') return new SupportError('not_found');
  if (error.code === '42501') return new SupportError('not_allowed');
  return new SupportError('unreachable');
}

/** A JSON object, or null for anything else. */
export function objectOf(value: Json | undefined): Record<string, Json | undefined> | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return null;
  return value;
}

/** Reads a text field of a JSON object, or null. */
export function textOf(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Reads a status, falling back to new for anything unknown. */
export function statusOf(value: unknown): TicketStatus {
  return ticketStatuses.find((status) => status === value) ?? 'new';
}

/** Reads a category, falling back to other for anything unknown. */
export function categoryOf(value: unknown): TicketCategory {
  return ticketCategories.find((category) => category === value) ?? 'other';
}

/**
 * Reads the member's ticket JSON.
 *
 * @param json - as my_support_ticket() returns it
 * @returns the ticket, or null when there is none
 */
export function myTicketFromJson(json: Json | null): MyTicket | null {
  const ticket = objectOf(json ?? undefined);
  if (ticket === null) return null;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  return {
    number: typeof ticket.number === 'number' ? ticket.number : 0,
    subject: textOf(ticket, 'subject') ?? '',
    status: statusOf(ticket.status),
    category: categoryOf(ticket.category),
    mergedInto: typeof ticket.merged_into === 'number' ? ticket.merged_into : null,
    messages: messages.flatMap((entry) => {
      const message = objectOf(entry);
      if (message === null) return [];
      return [
        {
          fromTeam: message.from_team === true,
          body: textOf(message, 'body') ?? '',
          at: textOf(message, 'at') ?? '',
        },
      ];
    }),
  };
}

/**
 * Asks the support team for help.
 *
 * @param client - the shared Supabase client
 * @param request - the subject, the words and what it is about
 * @returns the new ticket's number
 * @throws SupportError (refused: an empty field; too_many: the hourly limit)
 */
export async function createMyTicket(
  client: AppSupabaseClient,
  request: { subject: string; body: string; category: TicketCategory },
): Promise<number> {
  const { data, error } = await client.rpc('create_my_support_ticket', request);
  if (error !== null) throw supportErrorFrom(error);
  const answer = objectOf(data);
  return typeof answer?.number === 'number' ? answer.number : 0;
}

/**
 * Answers in one's own ticket; a solved or waiting ticket opens again.
 *
 * @throws SupportError (refused: an empty answer or a closed ticket)
 */
export async function replyToMyTicket(
  client: AppSupabaseClient,
  ticketNumber: number,
  body: string,
): Promise<void> {
  const { error } = await client.rpc('reply_my_support_ticket', {
    ticket_number: ticketNumber,
    body,
  });
  if (error !== null) throw supportErrorFrom(error);
}

/**
 * The caller's own tickets, newest activity first.
 *
 * @throws SupportError
 */
export async function fetchMyTickets(client: AppSupabaseClient): Promise<MyTicketSummary[]> {
  const { data, error } = await client.rpc('my_support_tickets');
  if (error !== null) throw supportErrorFrom(error);
  return data.map((row) => ({
    number: row.number,
    subject: row.subject,
    status: row.status,
    category: row.category,
    lastMessageAt: row.last_message_at,
    teamRepliedLast: row.team_replied_last,
  }));
}

/**
 * One of the caller's tickets, without notes or staff names.
 *
 * @returns the ticket, or null when it isn't theirs
 * @throws SupportError
 */
export async function fetchMyTicket(
  client: AppSupabaseClient,
  ticketNumber: number,
): Promise<MyTicket | null> {
  const { data, error } = await client.rpc('my_support_ticket', { ticket_number: ticketNumber });
  if (error !== null) throw supportErrorFrom(error);
  return myTicketFromJson(data);
}
