/**
 * The statements of reasons stored with a case, and the decision emails to the people who used
 * the public form (story S1-E10-04; DSA art. 17 and art. 16(5)).
 *
 * Who calls it: hooks/useCaseStatements.ts (the case page) and hooks/useDecisionEmails.ts (the
 * case page after a decision, and the queue's "Send waiting decision emails").
 * What it calls next: admin_case_statements() and admin_waiting_decision_email_count() in the
 * database, and POST /api/decision-emails (server/decision-emails.ts), which sends the emails with
 * the moderator's own sign-in token.
 */
import { statementFromJson, type StatementOfReasons } from '@/features/statements/api/statements';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/**
 * Lists the statements stored with one case, oldest first.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the statements
 * Errors: throws ModerationError('not_allowed') when the caller may not see the case.
 */
export async function listCaseStatements(
  client: AppSupabaseClient,
  caseId: string,
): Promise<StatementOfReasons[]> {
  const { data, error } = await client.rpc('admin_case_statements', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry) => statementFromJson(entry) ?? []);
}

/**
 * How many decision emails are waiting to be sent.
 *
 * @param client - the shared Supabase client
 * @returns the count (0 for anyone who may not send them)
 * Errors: throws ModerationError when the database can't be reached.
 */
export async function countWaitingDecisionEmails(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('admin_waiting_decision_email_count');
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data;
}

/** What the server says it did. */
export interface DecisionEmailResult {
  sent: number;
  failed: number;
}

/**
 * Asks the server to send every waiting decision email, as the signed-in moderator.
 *
 * @param client - the shared Supabase client, for the moderator's sign-in token
 * @returns how many left and how many failed (those stay waiting)
 * Errors: throws ModerationError: not_allowed (signed out or refused) or unreachable.
 */
export async function sendDecisionEmails(client: AppSupabaseClient): Promise<DecisionEmailResult> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new ModerationError('not_allowed');
  let response: Response;
  try {
    response = await fetch('/api/decision-emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ModerationError('unreachable');
  }
  if (response.status === 401 || response.status === 403) throw new ModerationError('not_allowed');
  if (!response.ok) throw new ModerationError('unreachable');
  return (await response.json()) as DecisionEmailResult;
}
