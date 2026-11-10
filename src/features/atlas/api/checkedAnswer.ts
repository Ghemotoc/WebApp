/**
 * checkedAnswer: the one check every Story Atlas change makes on the database's answer (bundle
 * ATLAS; first written for the bible, S1-E17-17).
 *
 * Who calls it: every api/ file of the Atlas; AddActForm and EditActForm read the hint with
 * refusalHintOf(). What it calls: nothing; it reads the answer Supabase returned and throws an
 * AtlasChangeError when the change didn't go through.
 */

/**
 * A change the database refused, with the hint it raised (such as 'name_taken'), so a screen can
 * say why in plain words (GAPS-2a break test, 10 Nov 2026).
 */
export class AtlasChangeError extends Error {
  /** The hint the database function raised, or null when it gave none. */
  readonly hint: string | null;

  constructor(message: string, hint: string | null | undefined) {
    super(message);
    this.name = 'AtlasChangeError';
    this.hint = hint === undefined || hint === '' ? null : hint;
  }
}

/**
 * The hint behind a failed change.
 *
 * @param error - whatever a change threw
 * @returns the database's hint, or null for any other failure (the connection, an outcome)
 */
export function refusalHintOf(error: unknown): string | null {
  return error instanceof AtlasChangeError ? error.hint : null;
}

/**
 * The answer of a change, or an error naming what didn't work.
 *
 * @param answer - what Supabase returned
 * @param action - the words for the error message ("add the section")
 * @param allowedOutcomes - the outcomes that aren't an error ('ok' unless the caller says more)
 * @returns the answer's object, whose outcome is 'ok' or one the caller allows
 */
export function checkedAnswer(
  answer: { data: unknown; error: { message: string; hint?: string | null } | null },
  action: string,
  allowedOutcomes: string[] = ['ok'],
): Record<string, unknown> {
  if (answer.error !== null) {
    throw new AtlasChangeError(`Could not ${action}: ${answer.error.message}`, answer.error.hint);
  }
  const data = answer.data as Record<string, unknown> | null;
  if (!allowedOutcomes.includes(String(data?.outcome))) {
    throw new Error(`Could not ${action}: ${String(data?.outcome)}`);
  }
  return data ?? {};
}
