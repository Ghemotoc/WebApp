/**
 * Why a staff change to the Writers' hub's content was refused, in the words the staff page has
 * text for (bundles GAPS-12c and GAPS-12d). Shared by the prompts and the calls for submissions,
 * so both sections report a refusal the same way.
 *
 * Who calls it: api/hubPrompts.ts, api/hubCalls.ts and the staff hooks.
 */

/** The messages the staff page can show. */
export type HubStaffFailure = 'not_allowed' | 'day_taken' | 'refused' | 'failed';

/** A refused staff change, carrying which message to show. */
export class HubStaffError extends Error {
  readonly failure: HubStaffFailure;

  constructor(failure: HubStaffFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Turns the database's refusal into the error to throw.
 *
 * @param error - what the call answered: its SQLSTATE and words
 * @returns the error, with the message to show
 */
export function hubStaffErrorFrom(error: { code?: string; message: string }): HubStaffError {
  // 42501: not contest staff. 23505: the day is taken. 23514: an empty, long or unsafe value.
  if (error.code === '42501') return new HubStaffError('not_allowed', error.message);
  if (error.code === '23505') return new HubStaffError('day_taken', error.message);
  if (error.code === '23514') return new HubStaffError('refused', error.message);
  return new HubStaffError('failed', error.message);
}

/**
 * Which message a failed change needs.
 *
 * @param error - what the mutation threw, or null
 * @returns the failure, or null when nothing failed
 */
export function hubStaffFailureOf(error: unknown): HubStaffFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof HubStaffError ? error.failure : 'failed';
}
