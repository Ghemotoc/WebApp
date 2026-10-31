/**
 * The age check's calls (story S1-E2-08, part 08a; ADR 0010).
 *
 * Who calls it: hooks/useMyAgeCheck.ts and components/AgeCheckPage.tsx.
 * What it calls next:
 * - my_age_check() in the database (…_s1_e2_08a_age_check.sql): the stored result, the line a
 *   new check tests and whether one can start or is on its way;
 * - POST /api/age-check/start (server/age-check.ts) with the person's own sign-in: a new session
 *   at Yoti (or the stand-in) and the page to open. The app never sees Yoti's key (criterion 1).
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
