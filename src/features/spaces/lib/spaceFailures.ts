/**
 * The words for a refused space change (bundle FORUMS-2, part a; story S1-E8-06).
 *
 * Who calls it: SpaceForm (creating and changing a space), SpaceJoinActions and
 * SpaceRequestsCard. It only picks the translation key; the screen says it in the reader's
 * language.
 */
import type { SpaceError } from '../api/spaces';

/**
 * The translation key and values for a refusal.
 *
 * @param failure - the error the change threw
 * @returns the key under "failures" and its values ("failures.name.taken", "failures.too_many"…)
 */
export function spaceFailureText(failure: SpaceError): [string, Record<string, unknown>] {
  const field = failure.details.field;
  if (failure.failure === 'invalid' && field !== undefined)
    return [`failures.${field.field}.${field.problem}`, {}];
  if (failure.failure === 'too_many') {
    const minutes = failure.details.waitMinutes ?? null;
    if (minutes === null) return ['failures.too_many_unknown', {}];
    return ['failures.too_many', { count: minutes }];
  }
  return [`failures.${failure.failure}`, {}];
}
