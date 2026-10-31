/**
 * Manual age checks for staff (story S1-E2-08, part 08b; board AdminUsers 8.5, the manual age
 * checks panel).
 *
 * Who calls it: hooks/useManualAgeChecks.ts.
 * What it calls next: admin_manual_age_checks() and admin_decide_manual_age_check()
 * (…_s1_e2_08b_manual_age_checks.sql). The database checks the role (owner, admin, moderator),
 * logs each year of birth shown and writes the decision to the audit log.
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One finished Yoti check in the history. */
export interface AgeCheckAttempt {
  threshold: number;
  outcome: 'passed' | 'failed';
  method: Database['public']['Enums']['age_check_method'];
  at: string;
}

/** One open request, as staff see it. Never a picture, a document or the user ID. */
export interface ManualAgeCheckRequest {
  requestId: string;
  handle: string | null;
  birthYear: number | null;
  birthMonth: number | null;
  ageBand: Database['public']['Enums']['age_band'];
  ageCheckResult: Database['public']['Enums']['age_check_result'];
  requestedAt: string;
  answerBy: string;
  attempts: AgeCheckAttempt[];
}

/** What staff can decide. */
export type ManualDecision = 'passed_13' | 'passed_18' | 'refused';

/** Why a call was refused, in words the page can explain. */
export type ManualAgeCheckFailure = 'not_allowed' | 'refused' | 'unreachable';

/** The error a refused call throws. */
export class ManualAgeCheckError extends Error {
  constructor(public readonly failure: ManualAgeCheckFailure) {
    super(`Manual age check call failed: ${failure}`);
  }
}

/**
 * The failure for a database error code: 42501 not allowed, 23514 a refused decision.
 *
 * @returns the failure
 */
function failureFromCode(code: string | undefined): ManualAgeCheckFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514') return 'refused';
  return 'unreachable';
}

/**
 * Lists the open requests, oldest first.
 *
 * @param client - the shared Supabase client
 * @returns the requests
 * Errors: throws ManualAgeCheckError('not_allowed') for support, content editors and members.
 */
export async function listManualAgeChecks(
  client: AppSupabaseClient,
): Promise<ManualAgeCheckRequest[]> {
  const { data, error } = await client.rpc('admin_manual_age_checks');
  if (error !== null) throw new ManualAgeCheckError(failureFromCode(error.code));
  return data.map((row) => ({
    requestId: row.request_id,
    handle: row.handle,
    birthYear: row.birth_year,
    birthMonth: row.birth_month,
    ageBand: row.age_band,
    ageCheckResult: row.age_check_result,
    requestedAt: row.requested_at,
    answerBy: row.answer_by,
    attempts: row.attempts as unknown as AgeCheckAttempt[],
  }));
}

/**
 * Records a decision on one request.
 *
 * @param client - the shared Supabase client
 * @param change - the request, the decision and the reason the person will read
 * Errors: throws ManualAgeCheckError with the reason the database gave.
 */
export async function decideManualAgeCheck(
  client: AppSupabaseClient,
  change: { requestId: string; decision: ManualDecision; reason: string },
): Promise<void> {
  const { error } = await client.rpc('admin_decide_manual_age_check', {
    request_id: change.requestId,
    decision: change.decision,
    reason: change.reason,
  });
  if (error !== null) throw new ManualAgeCheckError(failureFromCode(error.code));
}
