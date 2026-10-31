/**
 * checkedAnswer: the one check every Story Atlas change makes on the database's answer (bundle
 * ATLAS; first written for the bible, S1-E17-17).
 *
 * Who calls it: api/bible.ts and api/chapterPlans.ts. What it calls: nothing; it reads the
 * answer Supabase returned and throws a plain error when the change didn't go through.
 */

/**
 * The answer of a change, or an error naming what didn't work.
 *
 * @param answer - what Supabase returned
 * @param action - the words for the error message ("add the section")
 * @param allowedOutcomes - the outcomes that aren't an error ('ok' unless the caller says more)
 * @returns the answer's object, whose outcome is 'ok' or one the caller allows
 */
export function checkedAnswer(
  answer: { data: unknown; error: { message: string } | null },
  action: string,
  allowedOutcomes: string[] = ['ok'],
): Record<string, unknown> {
  if (answer.error !== null) throw new Error(`Could not ${action}: ${answer.error.message}`);
  const data = answer.data as Record<string, unknown> | null;
  if (!allowedOutcomes.includes(String(data?.outcome))) {
    throw new Error(`Could not ${action}: ${String(data?.outcome)}`);
  }
  return data ?? {};
}
