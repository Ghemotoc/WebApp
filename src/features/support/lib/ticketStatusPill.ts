/**
 * ticketStatusPill: which words and which pill colour a member sees for one of their support
 * requests (bundle G11c; the canvas's Support board: "We answered", "Open", "Solved").
 *
 * "We answered" wins while the request is still going and the team wrote last, because that is
 * the one state that asks the member to look. Solved and closed requests are sage, open ones sky,
 * waiting ones gold and on hold neutral, so the words carry the meaning and the colour helps.
 * Who calls it: MySupportPage and MySupportTicketPage. What it calls: nothing.
 */
import type { PillTone } from '@/components/ui/InfoPill';

import type { MyTicketSummary } from '../api/supportTickets';

/** The status the pill shows: a ticket status, or "answered". */
export type TicketPillState = MyTicketSummary['status'] | 'answered';

/** A pill's state and colour. */
export interface TicketStatusPill {
  state: TicketPillState;
  tone: PillTone;
}

/** The colour of each state. */
const toneOfState: Record<TicketPillState, PillTone> = {
  answered: 'gold',
  new: 'sky',
  open: 'sky',
  pending_on_user: 'gold',
  on_hold: 'neutral',
  solved: 'sage',
  closed: 'sage',
};

/**
 * Picks the pill for a request.
 *
 * @param status - the ticket's status
 * @param teamRepliedLast - whether the support team wrote the last message
 * @returns the state to name and its colour
 */
export function ticketStatusPill(
  status: MyTicketSummary['status'],
  teamRepliedLast: boolean,
): TicketStatusPill {
  // Step 1: a finished request says so, whoever wrote last.
  const isFinished = status === 'solved' || status === 'closed';
  // Step 2: otherwise the team's answer is what the member needs to see.
  const state: TicketPillState = !isFinished && teamRepliedLast ? 'answered' : status;
  return { state, tone: toneOfState[state] };
}
