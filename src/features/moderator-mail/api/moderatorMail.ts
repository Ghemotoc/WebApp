/**
 * Moderator mail: a member writes to the moderation team's shared inbox, and staff answer as "The
 * moderation team" (story S1-E10-11; DSA art. 12: a single point of contact for users).
 *
 * Who calls it: the hooks in ../hooks (the member's /moderator-mail pages and the staff inbox).
 * What it calls next: send_moderator_mail(), reply_moderator_mail(), my_moderator_mail(),
 * my_moderator_mail_thread() for members; admin_moderator_mail_inbox(),
 * admin_moderator_mail_thread(), admin_assign_mail(), admin_reply_mail() and
 * admin_set_mail_status() for staff (…_s1_e10_11_moderator_mail.sql). Members never see internal
 * notes or which person on the team wrote; staff steps are in the audit log without the words.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A thread's state: open (the team owes an answer), waiting (the member does) or closed. */
export type MailStatus = 'open' | 'waiting' | 'closed';

/** One thread in a list. */
export interface MailThreadSummary {
  reference: string;
  subject: string;
  status: MailStatus;
  lastMessageAt: string;
  /** Staff lists only. */
  memberHandle: string | null;
  assignedHandle: string | null;
  assignedToMe: boolean;
  messageCount: number;
  /** The decision the member linked, if any. */
  statementReference: string | null;
}

/** One message in a thread. */
export interface MailMessage {
  fromTeam: boolean;
  /** Staff view only: true for a note members never see. */
  isInternalNote: boolean;
  /** Staff view only: who wrote it. */
  authorHandle: string | null;
  body: string;
  at: string;
}

/** One thread with its messages. */
export interface MailThread {
  reference: string;
  subject: string;
  status: MailStatus;
  statementReference: string | null;
  memberHandle: string | null;
  assignedHandle: string | null;
  messages: MailMessage[];
}

/** Why a call didn't work. */
export type MailFailure = 'refused' | 'too_many' | 'not_found' | 'not_allowed' | 'unreachable';

/** The error a refused call throws; waitMinutes is set for too_many. */
export class MailError extends Error {
  constructor(
    public readonly failure: MailFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Moderator mail call failed: ${failure}`);
  }
}

/** The longest subject and message the database takes. */
export const mailLimits = { subject: 120, body: 4000 } as const;

/**
 * Turns a database error into a MailError.
 *
 * @param error - Postgres's code and hint
 * @returns the error to throw
 */
export function mailErrorFrom(error: { code: string; hint?: string | null }): MailError {
  if (error.code === '54000') {
    const minutes = /wait_minutes:(\d+)/.exec(error.hint ?? '')?.[1];
    return new MailError('too_many', minutes === undefined ? null : Number(minutes));
  }
  if (error.code === '23514') return new MailError('refused');
  if (error.code === 'P0002') return new MailError('not_found');
  if (error.code === '42501') return new MailError('not_allowed');
  return new MailError('unreachable');
}

/** Reads a text field of a JSON object, or null. */
function textOf(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Reads a status, falling back to open. */
function statusOf(value: unknown): MailStatus {
  return value === 'waiting' || value === 'closed' ? value : 'open';
}

/**
 * Reads a thread's JSON (the member's or the staff version).
 *
 * @param json - as the database returns it
 * @returns the thread, or null when there is none
 */
export function threadFromJson(json: Json | null): MailThread | null {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null;
  const messages = Array.isArray(json.messages) ? json.messages : [];
  return {
    reference: textOf(json, 'reference') ?? '',
    subject: textOf(json, 'subject') ?? '',
    status: statusOf(json.status),
    statementReference: textOf(json, 'statement_reference'),
    memberHandle: textOf(json, 'member_handle'),
    assignedHandle: textOf(json, 'assigned_handle'),
    messages: messages.flatMap((message) => {
      if (message === null || typeof message !== 'object' || Array.isArray(message)) return [];
      return [
        {
          fromTeam: message.from_team === true,
          isInternalNote: message.is_internal_note === true,
          authorHandle: textOf(message, 'author_handle'),
          body: textOf(message, 'body') ?? '',
          at: textOf(message, 'at') ?? '',
        },
      ];
    }),
  };
}

/* ---------- The member ---------- */

/**
 * Writes to the moderation team.
 *
 * @param client - the shared Supabase client
 * @param message - the subject, the words and, optionally, the decision it is about
 * @returns the new thread's reference
 * @throws MailError (refused: an empty field or someone else's decision; too_many: the hourly limit)
 */
export async function sendModeratorMail(
  client: AppSupabaseClient,
  message: { subject: string; body: string; statementReference: string | null },
): Promise<string> {
  const { data, error } = await client.rpc('send_moderator_mail', {
    subject: message.subject,
    body: message.body,
    statement_reference: message.statementReference ?? undefined,
  });
  if (error !== null) throw mailErrorFrom(error);
  const answer = data as { reference?: string } | null;
  return answer?.reference ?? '';
}

/**
 * Answers in one's own thread; a closed thread opens again.
 *
 * @throws MailError
 */
export async function replyAsMember(
  client: AppSupabaseClient,
  reference: string,
  body: string,
): Promise<void> {
  const { error } = await client.rpc('reply_moderator_mail', { thread_reference: reference, body });
  if (error !== null) throw mailErrorFrom(error);
}

/**
 * The caller's own threads, newest activity first.
 *
 * @throws MailError
 */
export async function fetchMyMail(client: AppSupabaseClient): Promise<MailThreadSummary[]> {
  const { data, error } = await client.rpc('my_moderator_mail');
  if (error !== null) throw mailErrorFrom(error);
  return data.map((row) => ({
    reference: row.reference,
    subject: row.subject,
    status: statusOf(row.status),
    lastMessageAt: row.last_message_at,
    memberHandle: null,
    assignedHandle: null,
    assignedToMe: false,
    messageCount: 0,
    statementReference: row.statement_reference,
  }));
}

/**
 * One of the caller's threads, without notes or staff names.
 *
 * @returns the thread, or null when it isn't theirs
 * @throws MailError
 */
export async function fetchMyMailThread(
  client: AppSupabaseClient,
  reference: string,
): Promise<MailThread | null> {
  const { data, error } = await client.rpc('my_moderator_mail_thread', {
    thread_reference: reference,
  });
  if (error !== null) throw mailErrorFrom(error);
  return threadFromJson(data);
}
