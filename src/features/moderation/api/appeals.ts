/**
 * Appeals against decisions, for staff: the list and the decision (story S1-E10-07; DSA art. 20;
 * architecture 1.8.4, screen 8.4).
 *
 * Who calls it: hooks/useAppeals.ts (AppealsPage).
 * What it calls next: admin_appeals_queue() and admin_decide_appeal() (…_s1_e10_07_appeals.sql).
 * Each checks the caller's role, staff session and, for a safeguarding case, the permission; the
 * decision refuses the moderator who made the original decision while someone else could decide
 * (art. 20(6): "not solely on the basis of automated means", and a different person where
 * possible). Overturning restores a hidden or removed item, lifts a sanction and approves a
 * removed picture; a raised rating stays. The person is told either way.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** An appeal's state. */
export type AppealStatus = Enums<'appeal_status'>;

/** One appeal as the staff page shows it. */
export interface StaffAppeal {
  id: string;
  reference: string;
  status: AppealStatus;
  statementReference: string;
  statementAction: Enums<'statement_action'>;
  caseReference: string | null;
  itemSummary: string | null;
  appellantHandle: string | null;
  explanation: string;
  originalDeciderHandle: string | null;
  /** False for the moderator who made the original decision, while someone else could decide. */
  mayDecide: boolean;
  createdAt: string;
  decidedAt: string | null;
  decidedByHandle: string | null;
  decisionNote: string | null;
  messageToPerson: string | null;
}

/** A decision on an appeal. */
export interface AppealDecision {
  outcome: 'upheld' | 'overturned';
  /** For the team only. */
  note: string;
  /** What the person reads: the reasons (art. 20(5)). */
  messageToPerson: string;
}

/**
 * Lists appeals, oldest first.
 *
 * @param client - the shared Supabase client
 * @param status - open, upheld or overturned; empty for all
 * @returns the appeals
 * Errors: throws ModerationError('not_allowed') for anyone who doesn't decide appeals.
 */
export async function listAppeals(
  client: AppSupabaseClient,
  status: AppealStatus | '',
): Promise<StaffAppeal[]> {
  const { data, error } = await client.rpc('admin_appeals_queue', {
    status_filter: status === '' ? undefined : status,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    statementReference: row.statement_reference,
    statementAction: row.statement_action,
    caseReference: row.case_reference,
    itemSummary: row.item_summary,
    appellantHandle: row.appellant_handle,
    explanation: row.explanation,
    originalDeciderHandle: row.original_decider_handle,
    mayDecide: row.may_decide,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decidedByHandle: row.decided_by_handle,
    decisionNote: row.decision_note,
    messageToPerson: row.message_to_person,
  }));
}

/**
 * Decides one appeal.
 *
 * @param client - the shared Supabase client
 * @param appealId - the appeal's ID
 * @param decision - the outcome, the team's note and the words to the person
 * Errors: throws ModerationError: not_allowed (42501: the original decider while someone else
 *   could decide, or no permission), refused (23514: decided already, or a missing message).
 */
export async function decideAppeal(
  client: AppSupabaseClient,
  appealId: string,
  decision: AppealDecision,
): Promise<void> {
  const { error } = await client.rpc('admin_decide_appeal', {
    target_appeal_id: appealId,
    outcome: decision.outcome,
    note_text: decision.note,
    message_to_person: decision.messageToPerson,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
