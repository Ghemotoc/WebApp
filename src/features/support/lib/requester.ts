/**
 * Facts about the person asking, for the support ticket page (story S1-E11-13 criterion 12;
 * bundle ADMIN-2h1).
 *
 * Who calls it: components/RequesterPanel.tsx. What it calls: nothing.
 */
import type { TicketRequester } from '../api/staffSupportTickets';

/**
 * True when the person is under 16: the 13 to 15 group (or younger, which shouldn't happen).
 *
 * @returns whether the banner shows
 */
export function isUnder16(requester: TicketRequester): boolean {
  return requester.ageGroup === '13_to_15' || requester.ageGroup === 'under_13';
}
