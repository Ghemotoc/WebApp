/**
 * When the data cache should try a failed read again (story S1-E2-QA; Robert's staging check,
 * 17 Oct 2026).
 *
 * Why: TanStack Query retries a failed read three times with growing pauses by default, about 7
 * seconds in all. That helps when the network drops for a moment, but a refusal (401 or 403: not
 * allowed, or the sign-in has ended) won't change on a second try, so the reader would wait 7
 * seconds for the same error. Refusals fail at once; everything else keeps the default retries.
 * Who calls it: src/app/AppProviders.tsx, as the QueryClient's default retry rule.
 * How errors carry the status: the api/ functions throw `new Error(message, { cause })` with
 * `refusalCause(status, error)` from the Supabase response, and this file reads it back.
 */

/** The HTTP statuses that mean "you may not", which a retry won't change. */
const refusalStatuses = new Set([401, 403]);

/**
 * Postgres and PostgREST codes that mean the same, in case the status is missing: 42501 is
 * "permission denied", PGRST301 to PGRST303 are a missing, invalid or expired sign-in token.
 */
const refusalCodes = new Set(['42501', 'PGRST301', 'PGRST302', 'PGRST303']);

/** How many times a read is tried again after a failure that isn't a refusal (the default). */
const maximumRetries = 3;

/** What an api/ function keeps from a failed Supabase response. */
export interface RefusalCause {
  status: number;
  code: string | undefined;
}

/**
 * Builds the cause to attach to a thrown error.
 *
 * @param status - the HTTP status of the Supabase response
 * @param error - the Supabase error, for its code
 * @returns the status and code, nothing personal
 */
export function refusalCause(status: number, error: { code?: string }): RefusalCause {
  return { status, code: error.code };
}

/**
 * Whether an error is a refusal, looking at it and at its cause.
 *
 * @param error - whatever the query threw
 * @returns true for a 401 or 403 (or their database codes)
 */
export function isRefusal(error: unknown): boolean {
  if (!(error instanceof Error) || typeof error.cause !== 'object' || error.cause === null) {
    return false;
  }
  // Step 1: read the status and code the api/ function kept, if any.
  const { status, code } = error.cause as Partial<RefusalCause>;
  // Step 2: either one is enough to call it a refusal.
  if (typeof status === 'number' && refusalStatuses.has(status)) return true;
  return typeof code === 'string' && refusalCodes.has(code);
}

/**
 * The QueryClient's retry rule.
 *
 * @param failureCount - how many times the read has failed so far
 * @param error - the latest error
 * @returns false for a refusal; otherwise true until the read has been retried three times
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isRefusal(error)) return false;
  return failureCount < maximumRetries;
}
