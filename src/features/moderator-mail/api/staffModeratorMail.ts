/**
 * Moderator mail for staff: the shared inbox, one thread with its notes, assigning, answering as
 * the team, internal notes and the status (story S1-E10-11; architecture 1.8.2: Moderation holds
 * moderator mail).
 *
 * Who calls it: hooks/useStaffMail.ts (StaffMailInboxPage, StaffMailThreadPage).
 * What it calls next: admin_moderator_mail_inbox(), admin_moderator_mail_thread(),
 * admin_assign_mail(), admin_reply_mail() and admin_set_mail_status(); each checks the caller may
 * act on moderation and writes the audit log (without the message text).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  mailErrorFrom,
  threadFromJson,
  type MailStatus,
  type MailThread,
  type MailThreadSummary,
} from './moderatorMail';

/** What the inbox can be narrowed by; empty strings mean "all". */
export interface InboxFilters {
  status: MailStatus | '';
  assigned: 'mine' | 'nobody' | '';
}

/**
 * The shared inbox, newest activity first.
 *
 * @throws MailError('not_allowed') for anyone outside moderation staff
 */
export async function fetchInbox(
  client: AppSupabaseClient,
  filters: InboxFilters,
): Promise<MailThreadSummary[]> {
  const { data, error } = await client.rpc('admin_moderator_mail_inbox', {
    status_filter: filters.status === '' ? undefined : filters.status,
    assigned_filter: filters.assigned === '' ? undefined : filters.assigned,
  });
  if (error !== null) throw mailErrorFrom(error);
  return data.map((row) => ({
    reference: row.reference,
    subject: row.subject,
    status: row.status === 'waiting' || row.status === 'closed' ? row.status : 'open',
    lastMessageAt: row.last_message_at,
    memberHandle: row.member_handle,
    assignedHandle: row.assigned_handle,
    assignedToMe: row.assigned_to_me,
    messageCount: row.message_count,
    statementReference: null,
  }));
}

/**
 * One thread with every message and note.
 *
 * @throws MailError
 */
export async function fetchStaffThread(
  client: AppSupabaseClient,
  reference: string,
): Promise<MailThread | null> {
  const { data, error } = await client.rpc('admin_moderator_mail_thread', {
    thread_reference: reference,
  });
  if (error !== null) throw mailErrorFrom(error);
  return threadFromJson(data);
}

/**
 * Assigns the thread to a moderator by username, or to nobody with an empty one.
 *
 * @throws MailError('refused') for someone who doesn't answer moderator mail
 */
export async function assignThread(
  client: AppSupabaseClient,
  reference: string,
  handle: string,
): Promise<void> {
  const { error } = await client.rpc('admin_assign_mail', {
    thread_reference: reference,
    assignee_handle: handle,
  });
  if (error !== null) throw mailErrorFrom(error);
}

/**
 * Answers as the team, or adds an internal note.
 *
 * @throws MailError
 */
export async function replyAsTeam(
  client: AppSupabaseClient,
  reference: string,
  body: string,
  isNote: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_reply_mail', {
    thread_reference: reference,
    body,
    is_note: isNote,
  });
  if (error !== null) throw mailErrorFrom(error);
}

/**
 * Sets the thread's status.
 *
 * @throws MailError
 */
export async function setThreadStatus(
  client: AppSupabaseClient,
  reference: string,
  status: MailStatus,
): Promise<void> {
  const { error } = await client.rpc('admin_set_mail_status', {
    thread_reference: reference,
    new_status: status,
  });
  if (error !== null) throw mailErrorFrom(error);
}
