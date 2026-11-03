/**
 * Unit tests for the inbox's first-reply timer (story S1-E11-13 criterion 6; bundle ADMIN-2h3a).
 */
import { describe, expect, it } from 'vitest';

import type { StaffTicketSummary } from '../api/staffSupportTickets';

import { firstReplyTimer } from './firstReplyTimer';

/** An inbox row, with any field changed. */
function row(changes: Partial<StaffTicketSummary> = {}): StaffTicketSummary {
  return {
    number: 1001,
    subject: 'Help',
    status: 'new',
    priority: 'normal',
    category: 'other',
    channel: 'in_app',
    requesterHandle: 'someone',
    emailOnly: false,
    assignedHandle: null,
    assignedToMe: false,
    messageCount: 1,
    lastMessageAt: '2026-11-03T10:00:00Z',
    firstReplyDueAt: '2026-11-04T10:00:00Z',
    firstRepliedAt: null,
    ...changes,
  };
}

describe('the first-reply timer', () => {
  it('shows the due time while the first answer is still in time', () => {
    expect(firstReplyTimer(row(), new Date('2026-11-03T12:00:00Z'))?.kind).toBe('due');
  });

  it('says overdue once the due time has passed', () => {
    expect(firstReplyTimer(row(), new Date('2026-11-05T12:00:00Z'))?.kind).toBe('overdue');
  });

  it('shows nothing once staff answered or the ticket is finished', () => {
    const later = new Date('2026-11-05T12:00:00Z');
    expect(firstReplyTimer(row({ firstRepliedAt: '2026-11-03T11:00:00Z' }), later)).toBeNull();
    expect(firstReplyTimer(row({ status: 'solved' }), later)).toBeNull();
  });
});
