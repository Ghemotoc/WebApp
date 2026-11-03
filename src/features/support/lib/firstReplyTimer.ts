/**
 * The first-reply timer of one ticket in the inbox (story S1-E11-13 criterion 6; bundle
 * ADMIN-2h3a): whether its first answer is still due, overdue, or nothing to show.
 *
 * Who calls it: FirstReplyPill. The due time comes from the database (support_first_reply_due():
 * working days after the ticket arrived, the support_first_reply_target_working_days setting).
 */
import type { StaffTicketSummary } from '../api/staffSupportTickets';

/** What the pill shows: due by a time, overdue since a time, or nothing. */
export type FirstReplyTimer = { kind: 'due' | 'overdue'; at: Date } | null;

/**
 * Works out the timer.
 *
 * @param ticket - the inbox row
 * @param now - the time now
 * @returns the timer, or null once staff answered or the ticket is solved or closed
 */
export function firstReplyTimer(ticket: StaffTicketSummary, now: Date): FirstReplyTimer {
  // Step 1: nothing to time once staff answered or the ticket is finished.
  if (ticket.firstRepliedAt !== null) return null;
  if (ticket.status === 'solved' || ticket.status === 'closed') return null;
  // Step 2: still in time, or late.
  const dueAt = new Date(ticket.firstReplyDueAt);
  return { kind: dueAt.getTime() > now.getTime() ? 'due' : 'overdue', at: dueAt };
}
