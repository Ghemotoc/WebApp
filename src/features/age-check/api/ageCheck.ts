/**
 * The age check's calls (story S1-E2-08, part 08a; ADR 0010).
 *
 * Who calls it: hooks/useMyAgeCheck.ts and components/AgeCheckPage.tsx.
 * What it calls next:
 * - my_age_check() in the database (…_s1_e2_08a_age_check.sql): the stored result, the line a
 *   new check tests and whether one can start or is on its way;
 * - POST /api/age-check/start (server/age-check.ts) with the person's own sign-in: a new session
 *   at Yoti (or the stand-in) and the page to open. The app never sees Yoti's key (criterion 1);
 * - request_manual_age_check() (…_s1_e2_08b_manual_age_checks.sql): "Ask for a manual check"
 *   after a failed check (part 08b).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

import {
  ageCheckFailureSchema,
  ageCheckStartResponseSchema,
  type AgeCheckFailure,
  type AgeCheckStartResponse,
} from '../../../schemas/ageCheck';

/** The stored result, from the generated enum (rule 14). */
export type AgeCheckResultValue = Database['public']['Enums']['age_check_result'];

/** How the stored result was reached, from the generated enum (rule 14). */
export type AgeCheckMethodValue = Database['public']['Enums']['age_check_method'];

/** A manual check request's state: open, or what staff decided (part 08b). */
export type ManualCheckStatus = 'open' | 'passed_13' | 'passed_18' | 'refused';

/** The person's latest manual check request. */
export interface ManualCheck {
  status: ManualCheckStatus;
  requestedAt: string;
  decidedAt: string | null;
  /** Staff's reason, once decided. */
  reason: string | null;
}

/** What the age check screens know about the person's check. */
export interface MyAgeCheck {
  result: AgeCheckResultValue;
  checkedAt: string | null;
  method: AgeCheckMethodValue | null;
  /** The age line a new check tests: 13 or 18. */
  threshold: number;
  canStart: boolean;
  /** A check was started and its result hasn't arrived yet. */
  isChecking: boolean;
  /** The account waits for a check to pass before it can write. */
  needsCheck: boolean;
  /** A manual check may be asked now: the latest check failed and nothing was asked since. */
  canAskManual: boolean;
  manualCheck: ManualCheck | null;
}

/** What my_age_check() answers. */
interface MyAgeCheckRow {
  outcome: string;
  result: AgeCheckResultValue;
  checked_at: string | null;
  method: AgeCheckMethodValue | null;
  threshold: number;
  can_start: boolean;
  is_checking: boolean;
  needs_check: boolean;
  can_ask_manual: boolean;
  manual_check: {
    status: ManualCheckStatus;
    requested_at: string;
    decided_at: string | null;
    reason: string | null;
  } | null;
}

/**
 * The latest manual check in the app's own shape.
 *
 * @returns the request, or null without one
 */
function manualCheckFrom(row: MyAgeCheckRow['manual_check']): ManualCheck | null {
  if (row === null) return null;
  return {
    status: row.status,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
    reason: row.reason,
  };
}

/** The cache key of the person's age check. */
export const myAgeCheckQueryKey = (userId: string | null) => ['my-age-check', userId];

/**
 * Reads the person's age check.
 *
 * @param client - the shared Supabase client
 * @returns the check, or null without a live profile
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyAgeCheck(client: AppSupabaseClient): Promise<MyAgeCheck | null> {
  const answer = await client.rpc('my_age_check');
  if (answer.error !== null)
    throw new Error(`Could not read your age check: ${answer.error.message}`);
  const row = answer.data as unknown as MyAgeCheckRow;
  if (row.outcome !== 'ok') return null;
  return {
    result: row.result,
    checkedAt: row.checked_at,
    method: row.method,
    threshold: row.threshold,
    canStart: row.can_start,
    isChecking: row.is_checking,
    needsCheck: row.needs_check,
    canAskManual: row.can_ask_manual,
    manualCheck: manualCheckFrom(row.manual_check),
  };
}

/** A start that didn't work, with the reason the page shows. */
export class AgeCheckStartError extends Error {
  readonly failure: AgeCheckFailure;

  constructor(failure: AgeCheckFailure) {
    super(`The age check didn't start: ${failure}`);
    this.failure = failure;
  }
}

/**
 * Starts a check: our server creates the session and answers the page to open.
 *
 * @param client - the shared Supabase client (for the sign-in token)
 * @returns the session ID, the SDK ID and the page
 * @throws AgeCheckStartError signed_out, not_needed, unavailable or unreachable
 */
export async function startAgeCheck(client: AppSupabaseClient): Promise<AgeCheckStartResponse> {
  // Step 1: the person's own sign-in token; our server acts only as them.
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new AgeCheckStartError('signed_out');
  // Step 2: the start itself; a network failure reads as "unreachable".
  const response = await fetch('/api/age-check/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (response === null) throw new AgeCheckStartError('unreachable');
  const body: unknown = await response.json().catch(() => null);
  // Step 3: the answer, checked against the shared contract.
  const started = ageCheckStartResponseSchema.safeParse(body);
  if (response.ok && started.success) return started.data;
  const failed = ageCheckFailureSchema.safeParse(body);
  throw new AgeCheckStartError(failed.success ? failed.data.error : 'unavailable');
}

/**
 * Asks for a manual check after a failed check (part 08b, criterion 7).
 *
 * @param client - the shared Supabase client
 * Errors: throws when the database refuses (no failed check first, or one already open) or can't
 *   be reached; the page then says it couldn't send the request.
 */
export async function requestManualAgeCheck(client: AppSupabaseClient): Promise<void> {
  const answer = await client.rpc('request_manual_age_check');
  if (answer.error !== null) {
    throw new Error(`Could not ask for a manual check: ${answer.error.message}`);
  }
}
